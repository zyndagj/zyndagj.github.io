---
layout: post
title:  "BSMAP Confidence Interval"
date:   2014-08-24
categories: bsmap methylation wilson confidence
---

I [previously discussed]({% post_url 2014-06-10-bsmap-frequency-recovery %}) what information BSMAP was using to make the methylation calls it output from methratio.py. This post follows up with an explanation about the last two columns in the BSMAP output, the confidence intervals. Confidence intervals are important because they show how uncertain a value is due to sampling error. Small samples will have large uncertainty and large samples will have small uncertainty.

I started by first determining what confidence interval BSMAP uses. Their original publication does not mention this, so I went though the `methratio.py` code and found they used the Wilson score interval [1]. The same confidence interval used for ranking reddit posts ([link](http://amix.dk/blog/post/19588) - website contains an incorrect implementation).

$$\frac{1}{1+\frac{z^2_{\alpha/2}}{n}}\left(\hat{p}+\frac{z^{2}_{\alpha/2}}{2n} \pm z_{\alpha/2} \sqrt{\frac{\hat{p}(1-\hat{p})}{n}+\frac{z^2_{\alpha/2}}{4n^2}}\right)$$

Where \(\hat{p}\) is the observed ratio of methylation and \(z_{\alpha/2}\) is the \(1-\alpha/2\) quantile of the normal distribution, and n is the number of samples (CT).

As a sanity check, I reimplemented the confidence interval in python to make sure I arrived at the same values BSMAP returns.



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

BSMAP confidence interval

Uses a wilson confidence interval.

Sources:
1. Wilson, E. B. (1927), "Probable Inference, the Law of Succession, and Statistical Inference," Journal of the American Statistical Association, 22, 209-212.

Nice explanation by Evan Miller
http://www.evanmiller.org/how-not-to-sort-by-average-rating.html

BSMAP uses this to look at the confidence of the methylation call

R implementation:
http://math.furman.edu/~dcs/courses/math47/R/library/Hmisc/html/binconf.html
