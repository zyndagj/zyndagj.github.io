---
layout: post
title:  "Exposing conda with LMOD"
date:   2020-04-30
categories: python lmod module conda tensorflow
---

The [Longhorn](https://www.tacc.utexas.edu/systems/frontera) GPU cluster at the Texas Advanced Computing Center, is comprised of 108 IBM Power System AC922 nodes, each with 4 NVIDIA V100 GPUs.
In addition to general GPU-accelerated applications, this system is meant to support machine learning.
If you go to PyPI, you will discover that there are official `x86_64` builds of [tensorflow-gpu](https://pypi.org/project/tensorflow-gpu/#files), but none for the PowerPC architecture.
Even if the architecture matched the system, you still have to hope it was compiled against your version of CUDA, since this is omitted from the package name.

I've learned from experience that compiling TensorFlow from source takes a significant amount of time, and it's especially hard to correctly link external math and MPI libraries into the Bazel build-system.
Luckily, IBM noticed this probablem too and decided to pre-compile and host machine learning packages, compilers, cuda libraries - an entire kitchen - in currated releases of PowerAI in their Watson Machine Learning conda repository.

### Some background on conda

[Conda](https://docs.conda.io/en/latest/) was originally developed for managing python packages and environments, but it has since evolved into a robust system for managing environment and both system and development packages from any language on all major operating systems in user space.
I have personally seen HPC (High-Performance Computing) centers both embrace and shun it.
For obvious reasons some administrators appreciate conda because it safely empowers a user with a package manager to `conda install` packages and system-level libraries.
Conversely, others do not encourage its use because individual conda installations will redundantly install many packages and libraries, which strains filesystem quotas and metadata servers.

Conda is not perfect, but it does have many thoughtful features that can be configured to prevent many problems.
Caching popular packages, advertising capability through environment modules, and documenting example usage may prevent the harmful usage that some administrators wish to avoid.

### Configuring conda

Conda should be installed and configured in the following way:

#### 1. Installation

Conda should be installed *once* to a performant location. Python packages generally rely on many other packages, which leads to many file-open operations at runtime, which can be harmful to shared filesystems.
This problem is traditionally circumvented by installing software to locally to each compute node.
My final conda installation - including all packages - was 151 GB, which is larger than the local disk space on most of our compute nodes.
Since I could not install conda locally, I chose our `/scratch` filesystem, which is tuned for higher performance and would be able to handle bursts of file reads.

```shell
$ bash Miniconda3-4.7.12.1-Linux-ppc64le.sh -b -p /scratch/apps/conda -s
```

#### 2. Configure the base system

Once installed, I recommend altering the system conda configuration for all users.
First, the number of worker threads should be increased to at least 2 to accelerate package installations and dependency resolution.
The speed at which conda functions has [improved over time](https://www.anaconda.com/blog/understanding-and-improving-condas-performance), but it will still churn on a single core and cause frustration.

```shell
# Activate conda environment without init
$ source /scratch/apps/conda/etc/profile.d/conda.sh
# Configure threads
$ conda conda config --system --set default_threads 4
```

Second, important package channels, such as [WMLCE](https://public.dhe.ibm.com/ibmdl/export/pub/software/server/ibm-ai/conda/), should be added.
The appropriate priority should also be set with strict adherence to ensure packages like `tensorflow-gpu`, which exist in multiple channels are only installed from the WMLCE channel.

```shell
# Prepend WMLCE channel (before defaults)
$ conda config --system --prepend channels https://public.dhe.ibm.com/ibmdl/export/pub/software/server/ibm-ai/conda/
# Set strict priority
$ conda config --system --set channel_priority strict
```

Last, I recommend disabling automatic conda updates.
I prefer to tie conda to a module with a specific version, and automatic updates would break that convention every time packages were installed.

```shell
$ conda config --system --set auto_update_conda False
```

#### 3. Limit package versions

Before creating any environments or installing packages, I recommend excluding any package versions your system does not support to limit user error.
For instance, if your system only has the version 10.1 of the NVIDIA cuda driver, you could limit the `cudatoolkit` package to 10.1.
My system cuda was recently updated to 10.2, so I will prevent the installation of the eventual `cudatoolkit-10.3*` by modifying the `conda-meta/pinned` file.

```shell
# Pin versions
$ echo "cudatoolkit <10.3" >> ${CONDA_DIR}/conda-meta/pinned

# Update permissions
$ chmod a+rX ${CONDA_DIR}/conda-meta/pinned
```

#### 4. Cache popular packages

By default, conda downloads packages once to the `${CONDA_DIR}/pkgs` directory and links them into future environments that require them.
This behavior is ideal for conserving space on single-user systems, since both the `pkgs` directory and all environments are owned by the same user.
However, on a multi-user system, normal user accounts are not allowed to modify neither the main conda installation nor the `pkgs` directory.
This means that very few packages are reused between environments, making each new environment extremely costly to storage space.

To encourage and enable the reuse of packages, I recommend caching many popular packages.
While this may initially take up a large ammount of space, it is much more sustainable as the number of users increases.
On a traditional x86_64 machine, a good start would be creating environments for each version of [`anaconda`](https://anaconda.org/anaconda/anaconda).
On Longhorn, the top-level `powerai` and `powerai-rapids` packages from IBM contain the most popular tools for machine learning, and can be cached using three possible methods:

1. Mirror repository with [conda-mirror](https://pypi.org/project/conda-mirror/)
  - Pro - easy to keep updated
  - Con - confusing because it requires a new installation channel
2. Download all packages on the WML CE to `${CONDA_DIR}/pkgs`
  - Pro - no additional channel
  - Con - harder to keep updated and liable to re-download packages
3. Create an environment for every possible python and powerai combination
  - Pro - easy to keep updated as new versions of powerai are released
  - Con - packages not contained in powerai, but still built by IBM will be missed

Each option has its own merits, but creating environments for every python/powerai combination is the easiest at both installing and keeping up to date over time.

```shell
# Install releases that only support python3
for pv in 1.7.0 1.6.2; do
    conda create -yn py3_powerai_$pv --strict-channel-priority python=3 powerai=$pv powerai-rapids=$pv;
done

# Install py2/3 releases
for pv in 1.6.1 1.6.0; do
    for pyv in 2 3; do
        conda create -yn py${pyv}_powerai_$pv --strict-channel-priority python=$pyv powerai=$pv;
    done
done
```

> PowerAI information - https://www.ibm.com/support/knowledgecenter/SS5SF7_1.7.0/navigation/wmlce_install.htm

### Creating conda environment modules

Now that conda is installed, both the base and each PowerAI environment need to be exposed to users.
On a cluster, most users look for available software with the

```shell
$ module avail

-------------------------- /opt/apps/xl16/modulefiles --------------------------
   spectrum_mpi/10.3.0 (L)

---------------------------- /opt/apps/modulefiles -----------------------------
   TACC                  (L)      autotools/1.2         (L)
   cmake/3.16.1          (L)      cuda/10.0             (g)
   cuda/10.1             (g)      cuda/10.2             (g,D)
   gcc/4.9.3                      settarg
   gcc/6.3.0                      tacc-singularity/3.4.2
   gcc/7.3.0                      tacc-singularity/3.5.3 (D)
   gcc/9.1.0             (D)      tacc_tips/0.5
```

command.
However, conda lists environments with the

```shell
$ source ${CONDA_DIR}/etc/profile.d/conda.sh
$ conda env list
# conda environments:
#
base                  *  /scratch/apps/conda/4.8.3
py2_powerai_1.6.0        /scratch/apps/conda/4.8.3/envs/py2_powerai_1.6.0
py2_powerai_1.6.1        /scratch/apps/conda/4.8.3/envs/py2_powerai_1.6.1
py3_powerai_1.6.0        /scratch/apps/conda/4.8.3/envs/py3_powerai_1.6.0
py3_powerai_1.6.1        /scratch/apps/conda/4.8.3/envs/py3_powerai_1.6.1
py3_powerai_1.6.2        /scratch/apps/conda/4.8.3/envs/py3_powerai_1.6.2
py3_powerai_1.7.0        /scratch/apps/conda/4.8.3/envs/py3_powerai_1.7.0
```

command after initialization.
At a minimum, the a module file should exist for loading the base environment of the conda installation we previously created.
I also encourage the creation of module files that load each powerai environment.
Each of these modules will need to perform the following operations:

**On load**

1. Use a standard location outside of `$HOME`, which has a quota, for user environments and any additional packages
   * Set `CONDA_ENVS_PATH` to both the system and user `/envs` paths
   * Set `CONDA_PKGS_DIRS` to both the system and user `/pkgs` paths
2. Initialize conda
3. Load the target environment

**On unload**

1. Deactivate each nested conda shell based on `CONDA_SHLVL`
2. Remove any paths that contain ${CONDA_DIR} from
   - PATH
   - LD_LIBRARY_PATH
3. Unset any environment variables with `CONDA` in the name

I found that setting additional `CONDA_` variables like `CONDA_EXE` and `CONDA_PYTHON_EXE` was neither necessary nor helpful since initializing conda creates them and LMOD unwinds variables before executing any unload commands.
Since the base conda environment does not need to load an environment, I recommend creating two module templates: `conda.tmpl` for the base conda and `env.tmpl` for each powerai environment.

<details><summary>conda.tmpl</summary><pre style="highlight">
local help_message = [[
The base Anaconda python environment.

You can modify this environment as follows:

  - Extend this environment locally

      $ pip install --user [package]

  - Create a new one of your own

      $ conda create -n [environment_name] [package]

https://docs.conda.io/projects/conda/en/latest/user-guide/getting-started.html

https://public.dhe.ibm.com/ibmdl/export/pub/software/server/ibm-ai/conda/#/
]]

help(help_message,"\n")

whatis("Name: conda")
whatis("Version: ${VER}")
whatis("Category: python conda")
whatis("Keywords: python conda")
whatis("Description: Base Anaconda python environment")
whatis("URL: https://docs.conda.io/projects/conda/en/latest/user-guide/getting-started.html")

local conda_dir = "${CONDA_DIR}"

-- Accept software license
setenv("IBM_POWERAI_LICENSE_ACCEPT","yes")
-- Specify where system and user environments should be created
setenv("CONDA_ENVS_PATH", os.getenv("SCRATCH") .. "/conda_local/envs:" .. conda_dir .. "/envs")
-- Directories are separated with a comma
setenv("CONDA_PKGS_DIRS", os.getenv("SCRATCH") .. "/conda_local/pkgs," .. conda_dir .. "/pkgs")

-- Initialize conda
execute{cmd="source " .. conda_dir .. "/etc/profile.d/conda.sh", modeA={"load"}}
-- Unload environments and clear conda from environment
execute{cmd="for i in $(seq ${CONDA_SHLVL:=0}); do conda deactivate; done; pre=" .. conda_dir .. "; \
	export LD_LIBRARY_PATH=$(echo ${LD_LIBRARY_PATH} | tr ':' '\\n' | grep . | grep -v $pre | tr '\\n' ':' | sed 's/:$//'); \
	export PATH=$(echo ${PATH} | tr ':' '\\n' | grep . | grep -v $pre | tr '\\n' ':' | sed 's/:$//'); \
	unset $(env | grep -o \"[^=]*CONDA[^=]*\");", modeA={"unload"}}

-- Prevent from being loaded with another system python or conda environment
family("python")
</pre></details>

<details><summary>env.tmpl</summary><pre style="highlight">
local help_message = [[
Anaconda python environment containing ${ENV}, which contains:

  - TensorFlow
  - PyTorch
  - and more

You can modify this environment as follows:

  - Extend this environment locally

      $ pip install --user [package]

  - Clone and modify this environment

      $ conda create --name myclone --clone py${PYV}_${ENV}
      $ conda install --name myclone new_package

  - Create a new one of your own

      $ conda create -n [environment_name] [package]

https://docs.conda.io/projects/conda/en/latest/user-guide/getting-started.html

https://developer.ibm.com/linuxonpower/2018/08/24/distributed-deep-learning-horovod-powerai-ddl/
]]

help(help_message,"\n")

whatis("Name: python${PYV}")
whatis("Version: ${ENV}")
whatis("Category: python conda powerai")
whatis("Keywords: python conda powerai")
whatis("Description: ${ENV} anaconda python environment")
whatis("URL: https://docs.conda.io/projects/conda/en/latest/user-guide/getting-started.html")

local conda_dir = "${CONDA_DIR}"

-- Accept software license
setenv("IBM_POWERAI_LICENSE_ACCEPT","yes")
-- Specify where system and user environments should be created
setenv("CONDA_ENVS_PATH", os.getenv("SCRATCH") .. "/conda_local/envs:" .. conda_dir .. "/envs")
-- Directories are separated with a comma
setenv("CONDA_PKGS_DIRS", os.getenv("SCRATCH") .. "/conda_local/pkgs," .. conda_dir .. "/pkgs")

-- Initialize conda and activate environment
execute{cmd="source " .. conda_dir .. "/etc/profile.d/conda.sh; conda activate py${PYV}_${ENV}", modeA={"load"}}
-- Unload environments and clear conda from environment
execute{cmd="for i in $(seq ${CONDA_SHLVL:=0}); do conda deactivate; done; pre=" .. conda_dir .. "; \
	export LD_LIBRARY_PATH=$(echo ${LD_LIBRARY_PATH} | tr ':' '\\n' | grep . | grep -v $pre | tr '\\n' ':' | sed 's/:$//'); \
	export PATH=$(echo ${PATH} | tr ':' '\\n' | grep . | grep -v $pre | tr '\\n' ':' | sed 's/:$//'); \
	unset $(env | grep -o \"[^=]*CONDA[^=]*\");", modeA={"unload"}}
-- Prevent from being loaded with another system python or conda environment
family("python")
</pre></details>

The final module files can then be created using `envsubst` as shown below:

```shell
# Same conda dir for all templates
CONDA_DIR=/scratch/apps/conda

# Create conda module
VER=4.8.3 envsubst '$CONDA_DIR $VER' < conda.tmpl > /scratch/apps/modulefiles/conda/$VER.lua

# Create python3 modulefiles
PYV=3
for ENV in powerai_{1.7.0,1.6.2}; do
    envsubst '$ENV $PYV $CONDA_DIR' < env.tmpl > /scratch/apps/modulefiles/python${PYV}/${ENV}.lua
done

# Create py2/3 modulefiles
for PYV in 3 2; do
    for ENV in powerai_{1.6.1,1.6.0}; do
        envsubst '$ENV $PYV $CONDA_DIR' < env.tmpl > /scratch/apps/modulefiles/python${PYV}/${ENV}.lua
    done
done
```

Assuming `/scratch/apps/modulefiles` is on your path, you should now be able to interact with your new modules. You'll also notice that new user environments are created in their scratch environment, and any cached packages are hard-linked, which don't count against disk usage. You can also go a step further by creating tensorflow and pytorch modules which `depends_on` specific PowerAI modules.

> The full source for this deployment can be found on [GitHub](https://github.com/TACC/longhorn_conda)