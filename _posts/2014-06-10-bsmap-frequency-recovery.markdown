---
layout: post
title:  "Calculating Methylation Frequency with BSMAP Reads"
date:   2014-06-10
categories: bsmap methylation asm
---

My preferred program for aligning [bisulfite-sequencing](http://en.wikipedia.org/wiki/Bisulfite_sequencing) reads to a reference is [BSMAP](https://sites.google.com/a/brown.edu/bioinformatics-in-biomed/bsmap-for-methylation). BSMAP is based on SOAP and aligns reads fairly quickly considering the variability that bisulfite treatment introduces. While there are other fast BS-Seq aligners ([GSNAP](http://research-pub.gene.com/gmap/), [Bismark](http://www.bioinformatics.babraham.ac.uk/projects/bismark/), [BS Seeker](http://pellegrini.mcdb.ucla.edu/BS_Seeker/BS_Seeker.html)) I prefer BSMAP because it comes with the script `methratio.py` to post-process the aligned reads for quick interpretation. The script parses all aligned reads and produces a tabulated output similar to [VCF](http://www.1000genomes.org/wiki/Analysis/Variant%20Call%20Format/vcf-variant-call-format-version-41) (Variant Call Format) which not only includes the methylation frequency, but also base representation from both strands. Below is an example of the output from `methratio.py`.

| chr | pos | strand | context | ratio | eff_CT | C | CT | rev_G | rev_GA | CI_lower | CI_upper |
|:---:|:---:|:------:|:-------:|:-----:|:------------:|:-------:|:--------:|:-----------:|:------------:|:--------:|:--------:|
| Chr1 | 34 | - | CTGAA | 0.200 | 5.00 | 1 | 5 | 0 | 0 | 0.036 | 0.624 |
| Chr1 | 80 | - | ATGAA | 0.000 | 6.00 | 0 | 6 | 2 | 2 | 0.000 | 0.390 |
| Chr1 | 93 | + | TACCT | 0.400 | 5.00 | 2 | 5 | 7 | 7 | 0.118 | 0.769 |
| Chr1 | 94 | + | ACCTA | 0.000 | 5.00 | 0 | 5 | 7 | 7 | -0.000 | 0.434 |
| Chr1 | 100 | + | TTCCC | 0.000 | 5.00 | 0 | 5 | 7 | 7 | -0.000 | 0.434 |
| Chr1 | 101 | + | TCCCT | 0.000 | 5.00 | 0 | 5 | 7 | 7 | -0.000 | 0.434 |
| Chr1 | 102 | + | CCCTA | 0.000 | 6.00 | 0 | 6 | 7 | 7 | 0.000 | 0.390 |
| Chr1 | 107 | + | AACCC | 0.143 | 7.00 | 1 | 7 | 7 | 7 | 0.026 | 0.513 |
| Chr1 | 108 | + | ACCCG | 0.875 | 8.00 | 7 | 8 | 7 | 7 | 0.529 | 0.978 |

My current project on allele specific methylation requires the raw read information instead of just the methylation frequency, so I decided to figure out what information is used to arrive at these methylation frequencies. To start off, I run BSMAP with the following parameters:

	bsmap -a read1.fq -b read2.fq -d reference.fa -o out.bam -w 2 -q 20 -z 33 -p 1 -r 0

| Flag | Value | Description |
|:----:|:-----:| ----------- |
| -w | 2 | Only outputs the two equally best hits (multiply mapping) |
| -q | 20 | Trims the tails of reads when quality is below a threshold of 20 |
| -z | 33 | Quality score format |
| -p | 1 | Number of processors to use |
| -r | 0 | Only report unique hits |

I use the redundant combination of `-w` and `-r` because I'm not sure if the unique hits are parsed out after processing, so I make sure read alignment stops when two equally best hits are found, which are then never reported because I only output unique hits. I then post-process the alignment files with methratio.py as follows:

	methratio.py -o out_methratio.txt -d reference.fa -u -p -z -r -m 5 in.bam

| Flag | Value | Description |
|:----:|:-----:| ----------- |
| -u |  | Only uses unique hits (redundant) |
| -p |  | Only uses reads mapped in a proper pair |
| -z |  | Report locations with zero-methylation (only T's reported) |
| -r |  | Remove duplicate reads |
| -m | 5 | Require read-depth of 5 |

I began my investigation at base 108 in Chromosome 1 of the TAIR10 reference since it only had 8 reads contributing to the methylation frequency, making it a simple place to start.

	Chr1    108     +       ACCCG   0.875   8.00    7       8       7       7       0.529   0.978

This record shows that of the reads 8 reads mapped to the positive strand at this location, 7 are reported as Cs (methylated) and 1 is a T (unmethylated). This means the final methylation frequency is 1/8 (0.875). I first checked the corresponding bam file ([explanation](http://samtools.github.io/hts-specs/SAMv1.pdf)) to see what reads were mapped to that location.

{% highlight bash %}
$ samtools view in.bam Chr1:108-108 | wc -l
55
{% endhighlight %}

Since 55 reads was more than the final 8, I decided to filter my reads using the same rules I specified for methratio.py. I first used `samtools rmdup` to remove duplicate reads. Then, I filtered out reads that weren't mapped in a pair using `samtools view`. This left me with 13 reads.

{% highlight bash %}
$ samtools view -b in.bam Chr1:108-108 > tmp.bam
$ samtools rmdup -h
$ samtools rmdup -S tmp.bam tmp_rmdup.bam
$ samtools view -f 2 tmp_rmdup.bam | wc -l
13
{% endhighlight %}

This method filtered out many of the extra reads, but I still had 5 more to remove from the set. Looking at the SAM records for all 13 reads made me realize that some were coming from the opposite strand of the CHG motif I was targeting, so they couldn't contribute any information about the methylation of the cytosine at 108. BSMAP keeps track of the strand information with the ZS:Z field.

| ZS:Z Field | Description |
|:----------:| ----------- |
| ++ | forward strand of Watson of reference (BSW) |
| +- | reverse strand of Watson of reference (BSWC) |
| -+ | forward strand of Crick of reference (BSC) |
| -- | reverse strand of Crick of reference (BSCC) |

From the 13 reads remaining, I filtered out any that came from the Crick of the reference (- strand) and was left with 8 reads. To make sure these were the reads I was looking for, I made a quick visualization of the results in samtools tview.

	1           1         1
	0           2         3
	8           0         0
	==============================
	CCGAAATCGGTTTTTCTGGTTGAAAATTAT
	ccgaaatcggtttttctggttgaaaattat
	ccgaaatcggtttttctggttgaaaattat
	CCGAAATCGGTTTTTCTGGTTGAAAATTAT
	TCGAAATCGGTTTTTCTGGTTGAAAATTAT
	CCGAAATCGGTTTCTCTGGTTGAAAATCAT
	CCGAAACCGGTTTTTCTGGTTGAAAATCAT
	CCGAAATTGGTTTCTCTGGTTGAAAATCAT

This shows that I have now recovered all 8 reads used by methratio.py to calculate the methylation frequency at base 108 in chromosome 1. This method also worked for

	Chr1    34      -       CTGAA   0.200   5.00    1       5       0       0       0.036   0.624

on the negative strand, but I only accepted reads from the Crick of the reference. Based on this result, it doesn't look like BSMAP requires reads from the opposite strand even though it looks at he G to A ratio. I may improve upon this script in the future and add a flag to require at least N G/A reads from the opposite strand.
