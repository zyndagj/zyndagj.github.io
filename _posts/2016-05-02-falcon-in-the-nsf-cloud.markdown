---
layout: post
title:  "Falcon in the NSF Cloud!"
date:   2016-04-29
categories: TACC assembly pacificbiosciences nsf stampede CyVerse
---

I am proud to announce the release of an optimized version of the Falcon assembler with the help of [Cyrus Proctor](https://www.tacc.utexas.edu/about/directory/cyrus-proctor) and [Jawon Song](https://www.tacc.utexas.edu/about/directory/jawon-song) at the Texas Advanced Computing Center. The [Falcon](https://github.com/PacificBiosciences/FALCON) diploid assembler is an exciting tool for biological research and allows for the assembly of complex genomes in record time. The tool is currently accessible on the [CyVerse Discovery Environment](https://de.iplantcollaborative.org/de/) and will be deployed as standard module on the [Stampede supercomputer](https://www.tacc.utexas.edu/stampede/) in an upcoming maintenance cycle.

Currently, each job launched from the CyVerse application can scale up to 30 nodes (30x16=480 cores) on Stampede. Besides providing horizontal scale to the workflow, the Falcon application has been optimized to:

- Not overload the SLURM scheduler
- Produce 1/64 fewer intermediate files
- Automatically recover from filesystem errors during high i/o operations
- Concensus comparisons run in shared memory
- Take advantage of vector instructions with the intel compiler

With these changes to the workflow and code, we can finish the [example ecoli assembly](https://github.com/PacificBiosciences/FALCON/blob/master/examples/fc_run_ecoli_2.cfg) in 54 minutes. The only difference in the configuration script, is that we set `-dal` to be a default of `128` for fewer tasks in the average assembly.

## Running Falcon on CyVerse

Falcon can be run from CyVerse by first opening the **Apps** window and either scroll down or searching for **FALCON (Small Genomes) 0.4.2** and opening with a double-click.
 
![falcon_01](https://pods.iplantcollaborative.org/wiki/download/attachments/22680422/falcon_01.png?api=v2)
 
After opening the app, you should get a prompt that looks like this.
 
![falcon_02.png](https://pods.iplantcollaborative.org/wiki/download/attachments/22680422/falcon_02.png?api=v2)
 
Click the **Inputs** drop-down to specify the data you want to use for input.
 
![falcon_03.png](https://pods.iplantcollaborative.org/wiki/download/attachments/22680422/falcon_03.png?api=v2)
 
For this example, we're going to use the **raw** example *E. coli* data that comes with FALCON ([link](https://github.com/PacificBiosciences/FALCON/blob/master/examples/run_ecoli_test.sh)). Both FALCON and [DAZZ_DB](https://github.com/thegenemyers/DAZZ_DB) expect that each fasta file have a unique barcode, set, and part number. If you are unsure about the formatting of your data, run it through the [FALCON-formatter](https://github.com/zyndagj/FALCON-formatter) tool. Using the directory tree on the left or by entering the directory in the main panel, select a *folder* or *file* of fasta inputs to use with FALCON.
 
![falcon_04.png](https://pods.iplantcollaborative.org/wiki/download/attachments/22680422/falcon_04.png?api=v2)
 
After choosing your selection, make sure your input is correct before moving on to the **Parameters** section.
 
![falcon_05.png](https://pods.iplantcollaborative.org/wiki/download/attachments/22680422/falcon_05.png?api=v2)
 
The pre-populated default parameters are the values recommended by PacificBiosciences to assemble the provided *E. coli* data. Upon successful completion, a single primary contig with 99.77% identity (this is good) to the [MG1655 strain K-12 *E. coli* reference](http://www.ncbi.nlm.nih.gov/nuccore/NZ_APIN01000002.1) on NCBI. for assembling provided E. coli parameters and yield a single primary contig in the results. When using different data, refer to the [CyVerse documentation](https://pods.iplantcollaborative.org/wiki/display/DEapps/FALCON+%28Small+Genomes%29+0.4.2) to choose parameters that fit your data.
 
![falcon_06.png](https://pods.iplantcollaborative.org/wiki/download/attachments/22680422/falcon_06.png?api=v2)
 
While the execution has been optimized for running on Stampede, FALCON submits many separate jobs that all wait in line to run. Please be patient with these jobs as thousands of other users also use Stampede for their research. When your job completes, you should be left with a FALCON (Small Genomes) 0.4.2 run in your analyses folder.
 
![falcon_07.png](https://pods.iplantcollaborative.org/wiki/download/attachments/22680422/falcon_07.png?api=v2)

The assembled contigs are found in:

- `2-asm-falcon/p_ctg.fa`	Primary contigs
- `2-asm-falcon/a_ctg.fa`	Associated contigs

More detailed information about the output can be found on the [CyVerse Documentation](https://pods.iplantcollaborative.org/wiki/display/DEapps/FALCON+%28Small+Genomes%29+0.4.2) and the [official Falcon github](https://github.com/PacificBiosciences/FALCON/tree/master).

## Running Falcon on Stampede

While the system module is not deployed yet, I have made a local Falcon module available to users to immediately start running. Start by installing the local module to your home directory.

```shell
$ mkdir ~/apps
$ cd /scratch/projects/tacc/bio/rpms
$ scripts/myRpmInstall ~/apps tacc-falcon-0.4.2-1.x86_64.rpm
Installing RPM
Preparing...
########################################### [100%]
   1:tacc-falcon
########################################### [100%]
Editing modulefile paths
Updating paths in the modulefile $HOME/apps/modulefiles/falcon/0.4.2.lua
Checking the $MODULEPATH variable.
looks like the $MODULEPATH environment variable needs updating.               
Check the README.md file if you aren't sure how to do that.
```

You will then need to add the apps directory to your `MODULEPATH`, so Lmod can find it.

```shell
$ module use ~/apps/modulefiles
## Save the module path for the next login
$ module save
```

Now, you can load the Falcon module.

```shell
$ module load python hdf5 falcon
$ fc_run.py
['/tmp/gzynda/apps/falcon/0.4.2/bin/fc_run.py']

you need to specify a configuration file"
usage: fc_run fc_run.cfg [logging.cfg]
```

You are now ready to run!

Start by grabbing the example *E. coli* data from my public folder. Make sure that you're doing this in a good workspace on `$SCRATCH`. Then create the file `input.fofn`, which is a list of all input fasta files.

```shell
$ gzip -cd /work/03076/gzynda/public/data/ecoli_K-12_MG1655_sample.fasta.gz > ecoli_K-12_MG1655_sample.fasta
$ ls *.fasta > input.fofn
```

Next, alter the Falcon configuration file below to include your TACC or XSEDE allocation (`TACC_ALLOCATION`), so it can submit jobs to our SLURM scheduler.

#### File - job.cfg

```shell
[General]
# list of files of the initial bas.h5/fasta files                                           
input_fofn = input.fofn

# Input either raw fasta reads or pre-corrected preads
input_type = raw

# The length cutoff used for seed reads used for initial mapping
length_cutoff = 12000

# The length cutoff used for seed reads usef for pre-assembly
length_cutoff_pr = 12000

# Use /tmp
use_tmpdir = True

#job_type = local
job_type = SLURM
jobqueue = normal
allocation = TACC_ALLOCATION
ncores = 16
sge_option_da  = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s
sge_option_la  = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s
sge_option_pda = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s
sge_option_pla = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s
sge_option_fc  = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s
sge_option_cns = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s

maxJobs = 30
pa_concurrent_jobs = %(maxJobs)s
ovlp_concurrent_jobs = %(maxJobs)s

pa_HPCdaligner_option = -M20 -dal128 -t16 -e0.7 -l1000 -s500 -h35
ovlp_HPCdaligner_option = -M20 -dal128 -t32 -e0.96 -l500 -s500 -h60

pa_DBsplit_option = -x500 -s200
ovlp_DBsplit_option = -x500 -s200

falcon_sense_option = --output_multi --min_idt 0.7 --min_cov 4 --max_n_read 200 --n_core 9
cns_concurrent_jobs = %(maxJobs)s

overlap_filtering_setting = --max_diff 100 --max_cov 100 --min_cov 20 --bestn 10 --n_core 16
```

Then, you just need to **launch Falcon from a login node**, since it needs to submit jobs using `sbatch`.

```shell
$ fc_run.py job.cfg
```

## Understanding the output

The output will appear in the `2-asm-falcon` folder. Inside, there are two important files:

- `2-asm-falcon/p_ctg.fa` - Primary contigs
- `2-asm-falcon/a_ctg.fa` - Associated contigs

If your input data was haploid, then all contigs should be primary (p_ctg.fa). Any associated contigs come from sequencing errors and segmental duplications. If the input data was diploid, then most of the associated contigs will be alternate alleles. We can check the status of the E. coli output with samtools.

```shell
$ samtools faidx p_ctg.fa
$ cat p_ctg.fa.fai
000000F 4635638 85      4635638 4635639
```

Falcon left us with a single 4.6 megabase contig. You can also blast this against the [NCBI record for *E. coli* strain K-12 substrain MG1655](http://www.ncbi.nlm.nih.gov/nuccore/NZ_APIN01000002.1) and double-check the identity.

More information on the output can be found at:
https://github.com/PacificBiosciences/FALCON/tree/master

## Future work
Falcon throughput is currently hindered on a production cluster since the scheduler is used as a load balancer. I have been working on a virtual queue that will run in a normal multi-node job environment and accept normal job commands to launch tasks on the available nodes. This will be a drop-in bandaid and will not require any modification to the Falcon code, so it may be applied to other software like SMRT, Trinity, and Cluster Flow.
