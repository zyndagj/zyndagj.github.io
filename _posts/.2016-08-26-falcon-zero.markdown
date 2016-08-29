---
layout: post
title:  "Falcon-Zero: Maximum Velocity"
date:   2016-08-25
categories: TACC assembly pacificbiosciences nsf stampede CyVerse
---

I [previously]({% post_url 2016-05-02-falcon-in-the-nsf-cloud %}) demonstrated how to complete an assembly of the E. coli genome in 54 minutes using Stampede at TACC and CyVerse. While convenient, this is fairly slow for the amount of provided resources compared to the input size. Out of the box, Falcon can run concurrent tasks on multiple compute nodes. However, this is done by submitting each task as a separate batch job to the system scheduler. A system scheduler is not meant to be a high-performance load balancer, but a fair way schedule variable sized workloads to run. Our systems, which are available to local UT-system, national NSF, and global collaborating researchers, are often oversubscribed and subject to fairly long waiting times. This renders any assumption that hundreds or thousands of job submissions can be run to accomplish a given task totally impractical.

To get the best runtime possible while also demonstrating Falcon’s ability to distribute jobs, I ran the original E. coli assembly job during the night when the system load decreases. Even with these ideal conditions, there was still significant overhead from SLURM because a [prolog](http://slurm.schedmd.com/prolog_epilog.html) is run before each job to sanitize and prepare the user environment for each new task. This necessary step takes about 20 seconds, but these 20 seconds add up when the task count is in the hundreds or thousands.

To reduce the overhead and runtimes for these tasks, I developed the [vQ](https://github.com/zyndagj/vQ), a virtual queue for multi-node jobs that will dynamically balance the execution of tasks issued with normal SLURM commands across a pre-allocated set of computing nodes on a shared resource. vQ is a drop-in solution that overloads all SLURM queue commands, without requiring any changes to the Falcon source code. This removes any wait time between tasks, all while handling I/O redirection and return codes.

Using the same job config as [before]({% post_url 2016-05-02-falcon-in-the-nsf-cloud %})

```shell
[General]
input_fofn = input.fofn
input_type = raw
length_cutoff = 12000
length_cutoff_pr = 12000

use_tmpdir = True

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

I added the `vQ.py` program before the `fc_run` command in my SLURM batch script

```shell
#!/bin/bash
#SBATCH -J ecoli_vq
#SBATCH -o ecoli_vq.%j.o
#SBATCH -e ecoli_vq.%j.e
#SBATCH -p normal
#SBATCH -t 2:00:00
#SBATCH -N 5
#SBATCH -n 5
#SBATCH -A TACC_ALLOCATION

module use /work/03076/gzynda/public/apps/modulefiles
module load python/2.7.9 hdf5 falcon vq

time vQ.py fc_run job.cfg
```

Note that I am running this job on 5 nodes instead of the previous limit of 30 because the 200 megabase input partitions ran on 5 nodes at max. With this single change, the job completed in 24 minutes. Over half of the previous 54 minutes was spent as queue overhead. And while vQ allows falcon to run twice as fast, we should be able to craft more efficient jobs by optimizing the configuration.

Use smaller blocks and multiple tasks per node to saturate CPU
Choose an optimal kmer size and frequency
Use less of the data

## Choosing a block size
The block size is the first parameter that needs to be chosen because it not only affects the structure of the computation, but also many of the parameters. The block size literally defines the partition size of the input reads. First, the number of blocks affects the number of tasks and files created for the assembly. For large assemblies, the block size should be made fairly large (> 200 mb) since huge numbers of files causes slowdowns and eventually crashes in lustre metadata servers. However, this may require several rounds of tuning on the other parameters to ensure that tasks do not fail from memory overallocation.

For small genomes, like E. coli, I suggest a block size that is about 10 times the size of the genome or smaller. This is because the k-mer filtering steps are on a block basis, so even if you choose large k values, the kmer will be seen the number of times the genome can be fit in the block size.

## Kmer size and frequency
To improve the runtime of the E. coli example, used a block size of 50 megabases, and 13 base pair (bp) k-mers. A 13 bp kmer is expected to be seen

$$\frac{4.6*10^6-(13-1)}{4^{13}} = 0.069 \text{ times}$$

in the genome. Because this number is less than 1, we know that k is large enough to ensure the uniqueness of a kmer apart from sequence duplication. Normally you would then choose a conservative value like 3, but this would be too low for our case. The `-t` parameter is a counts the number of appearances per block. The 4.6 megabase genome fits in the 50 megabase block almost 11 times, so `-t` needs to be at least 11. I found multiplying the minimum `-t` by 1.5 yielded decent results and did not allow for overalignment. Remember from the documentation that this is a read cutoff, so DALIGNER will find `-t` reads with a specific kmer in a block and then discard the rest. This is irrespective of length and alignment quality, making the final assembly completely dependent on input order at small values of `-t`.

## Read filtering
Since reads are indiscriminately filtered by DALIGNER, we want to make sure that the best (longest) reads are used first. Some steps like error correction make sure to always use the longest reads, but DALIGNER, the first step, does not. The original configuration used reads at least 12,000 base pairs long as the primary reads. This equated to 133x coverage with their sample dataset. Due to cost, this is an unreasonable coverage expectation for most eukaryotic assemblies. I found decent results in the 20x range and was able to reach a single-molecule assembly with primary reads at least 23,000 base pairs long, yielding 27x coverage. While this gave me a theoretical coverage of 27x, I had to drop the overlap minimum coverage to 2 for the final assembly as shown in my job script below.

```shell
[General]
input_fofn = input.fofn
input_type = raw
length_cutoff = 23000
length_cutoff_pr = 23000
use_tmpdir = True
job_type = SLURM
jobqueue = normal
allocation = TACC_ALLOCATION

ncores = 8
sge_option_da  = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s
sge_option_la  = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s
sge_option_pda = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s                        
sge_option_pla = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s
sge_option_fc  = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s
sge_option_cns = -n %(ncores)s -t 05:00:00 -A %(allocation)s -p %(jobqueue)s

maxJobs = 8
pa_concurrent_jobs = %(maxJobs)s
ovlp_concurrent_jobs = %(maxJobs)s

pa_HPCdaligner_option = -vb -dal128 -e0.75 -l1000 -k13 -s1000 -t15 -w9 -h320
ovlp_HPCdaligner_option = -vb -dal128 -e.96 -l1000 -k13 -s1000 -t15 -w9 -h448

pa_DBsplit_option = -x4000 -s50
ovlp_DBsplit_option = -x4000 -s50

falcon_sense_option = --output_multi --min_idt 0.75 --min_cov 4 --max_n_read 200 --n_core %(ncores)s
cns_concurrent_jobs = %(maxJobs)s

overlap_filtering_setting = --max_diff 15 --max_cov 44 --min_cov 2 --n_core %(ncores)s --bestn 50
```

This executed finished in 5 minutes and 33 seconds using the following batch script:

```shell
#!/bin/bash
#SBATCH -J ecoli_fast
#SBATCH -p normal
#SBATCH -t 0:30:00
#SBATCH -N 5
#SBATCH -n 5
#SBATCH -A TACC_ALLOCATION

module use /work/03076/gzynda/public/apps/modulefiles
module load python/2.7.9 hdf5 falcon vq

export VQ_PPN=2
time vQ.py fc_run job.cfg
```

Notice that we’re launching two tasks at a time on each of our 5 requested nodes.

![c_falcon_banner](https://cloud.githubusercontent.com/assets/6790115/18040064/0fe66e0e-6d6f-11e6-98db-9142c3632fae.jpg)

## Future
Second to actually running Falcon, I find that users have significant trouble crafting ideal job configurations. To improve this process and give first-time users a point to start from, I plan on developing and releasing a tool that will generate configuration files from an input dataset and a target genome size. I don’t expect this to be optimal since we’re dealing with a process dependent on input order, but it should be a decent first-pass with room for improvement by relaxing some values.
