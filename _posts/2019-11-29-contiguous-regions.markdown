---
layout: post
title:  "Finding contiguous region coordinates with python"
date:   2019-11-29
categories: python numpy contiguous interval
---

Bioinformatics often deals with sequential data with data laid out on a 1-dimensional genomic coordinate system.
Since these data signals are often compared against functional regions in genome annotations, it is often necessary to identify _contiguous_ regions of interest. I have never come across a function built into numpy or scipy to accomplish this, but I was inspired from two stackoverflow posts:

- [starting index of changing value](https://stackoverflow.com/a/1044443)
- [finding regions of consecutive 1s](https://stackoverflow.com/a/31544723)

Assuming I have data like:

```python
D1 = np.array([10, 9, 1, 2, 8, 9, 10, 2, 1, 11, 9])
D2 = np.array([10, 9, 9, 10, 11, 1, 1, 2, 2, 1, 3])
D3 = np.array([1, 1, 2, 2, 1, 3, 10, 9, 9, 10, 11])
```

and I am interested in finding contiguous regions with signal greater than 7, I would first apply that logic function and receive the boolean arrays

```python
>>> B1 = D1 > 7
>>> print(B1.astype(int))
[1 1 0 0 1 1 1 0 0 1 1]

>>> B2 = D2 > 7
>>> print(B2.astype(int))
[1 1 1 1 1 0 0 0 0 0 0]

>>> B3 = D3 > 7
>>> print(B3.astype(int))
[0 0 0 0 0 0 1 1 1 1 1]
```

For D1/B2, my end goal is to return the indices:

```
B1      [1 1 0 0 1 1 1 0 0 1 1]
Index    0 1 2 3 4 5 6 7 8 9 0
Indices [0,  2]                    where np.all(B1[0:2] == 1)
                [4,    7]          where np.all(B1[4:7] == 1)
                          [9, 11]  where np.all(B1[9:11] == 1)
```

First, the difference needs to be calculated along each array using numpy's [diff](https://docs.scipy.org/doc/numpy/reference/generated/numpy.diff.html) function. This has two quirks:

1. The array returned by diff is 1 element shorter than the input since it compares adjacent pairs.
2. Diff normally returns the difference, but since our input is boolean, the output of diff is too.

```
>>> np.diff([1,1,0,1])
array([ 0, -1,  1])

>>> np.diff([True, True, False, True])
array([False,  True,  True])
```

Since we are also interested in regions that could start with the first value or end with the last value, we need to append and prepend 0's (False) to our boolean arrays.

```python
>>> B1W0 = np.r_[False, B1, False]
>>> B2W0 = np.r_[False, B2, False]
>>> B3W0 = np.r_[False, B3, False]
```

I like to use numpy's [`r_`](https://docs.scipy.org/doc/numpy/reference/generated/numpy.r_.html) function, but concatenate will also work if you specify an axis.

With the addition of these values, the difference function will then return


```python
>>> Diff1 = np.diff(B1W0)
>>> print(B1W0.astype(int))
[0 1 1 0 0 1 1 1 0 0 1 1 0]
>>> print(Diff1.astype(int))
[1 0 1 0 1 0 0 1 0 1 0 1]

>>> Diff2 = np.diff(B2W0)
>>> Diff3 = np.diff(B3W0)
```

The [nonzero function](https://docs.scipy.org/doc/numpy/reference/generated/numpy.nonzero.html) can then be used to identify the locations of all non-zero values from diff. `nonzero` returns a tuple, so we'll extract that first array and store it.

```python
>>> idx1 = Diff1.nonzero()[0]
>>> print(idx1.astype(int))
[ 0  2  4  7  9 11]

>>> idx2 = Diff2.nonzero()[0]
>>> idx3 = Diff3.nonzero()[0]
```

Which can then be reshaped into interval pairs

```python
>>> I1 = np.reshape(idx1, (-1,2))
>>> print(I1)
[[ 0  2]
 [ 4  7]
 [ 9 11]]

>>> I2 = np.reshape(idx2, (-1,2))
>>> print(I2)
[[0 5]]

>>> I3 = np.reshape(idx3, (-1,2))
>>> print(I3)
[[ 6 11]]
```

to match the original goal. I have summarized this methodology in the `calcRegionBounds` function below.

```
def calcRegionBounds(bool_array):
	'''
	Returns the lower and upper bounds of contiguous regions.
	
	Parameters
	==========
	bool_array	1-D Binary numpy array
	'''
	assert(bool_array.dtype == 'bool')
	idx = np.diff(np.r_[0, bool_array, 0]).nonzero()[0]
	assert(len(idx)%2 == 0)
	return np.reshape(idx, (-1,2))
```