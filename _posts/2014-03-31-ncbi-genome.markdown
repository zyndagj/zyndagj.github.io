---
layout: post
title:  "Exponential Growth of NCBI Genomes"
date:   2014-03-31 23:40:00
categories: ncbi genome python
---

I have been studying bioinformatics for 4 years and had the privilege to work in a sequencing lab and personally see the technology change and accelerate. In 2010 when I entered the CGB, a whole genome generally cost around $10,000. In 2013, the IU Bioinformatics Club sequenced a human genome for $4,000. Now, Google's [Calico](http://business.time.com/2013/09/18/google-extend-human-life/) is pushing for the $1,000 human genome. Now on the verge of [Oxford nanopore technology](https://www.nanoporetech.com/), the personal sequencer is almost a reality.

In light of the affordability of whole-genome sequencing, I wanted to know how many genomes were currently sequenced and completed in NCBI's databases. I first looked around their [RefSeq](http://www.ncbi.nlm.nih.gov/refseq/) page and found their [growth statistics](http://www.ncbi.nlm.nih.gov/refseq/statistics/) figures. They showed the exponential growth of their records plotted on a logarithmic scale, but the data seemed to include all sequences submitted to RefSeq and not just genomes.

![RefSeq figure](/assets/refseq.png)

I continued my search to NCBI's [genome](http://www.ncbi.nlm.nih.gov/genome) section, but they didn't have nice statistics comparable to RefSeq. The [virus genome](http://www.ncbi.nlm.nih.gov/genomes/GenomesHome.cgi?taxid=10239) page had a "statistics" page that consisted of a table of completed genomes, but the [plant genome](http://www.ncbi.nlm.nih.gov/genomes/PLANTS/PlantList.html) page did not. Since the custom resource pages did not have anything useful, I decided to look around the [ftp site](ftp://ftp.ncbi.nlm.nih.gov/genomes/).

I ended up finding the [GENOME_REPORTS](ftp://ftp.ncbi.nlm.nih.gov/genomes/GENOME_REPORTS/) folder, which contained data on submitted eukaryote, prokaryote, and virus genomes. Judging by the modification dates, these are all updated regularly as well. I started with a python script that parsed each of the files to filter out all genomes that were not completed by checking the project status and whether or not whole genomes were assembled instead of contigs or scaffolds. I then used numpy's bincount function to sort and count the years the genomes were completed. This left me with a dictionary of years and the total number of occurrences for each of those years. I then plotted the cumulative sum of this timeline in matplotlib.

![completed genomes](/assets/genome_completed.png)

Since I wanted these values to be reflect the current data whenever it was updated, I decided to pull each of these files using python's httplib. My resulting script with instructions can be found at my github project page [https://github.com/zyndagj/ncbi_genomes].
