---
layout: post
title:  "Multiprocessing Size and Rank"
date:   2018-05-26
categories: python developer multiprocessing
---

I have always thought Python did a great job exposing parallel processing with the [`multiprocessing`](https://docs.python.org/2/library/multiprocessing.html) package. The [`Pool`](https://docs.python.org/2/library/multiprocessing.html#module-multiprocessing.pool) class in particular made it relatively simple to jump from the built-in [`map`](https://docs.python.org/2/library/functions.html#map) function, which is a good first step to accelerating loops, to utilizing all cores on a processor without any obscure hoops.

All `multiprocessing` functions spawn new processes, so standard objects, even those in global scope, are not shared between processes. This means that all input gets broadcast to child processes, either manually with [`Pipe` and `Queue`](https://docs.python.org/2/library/multiprocessing.html#pipes-and-queues) functions, or automatically with process Pools. These functions can be relied upon when data is small and work is complex. When data grows, and work is simple, communication quickly becomes the bottleneck. I have recently been circumventing this with [shared `ctypes` objects](https://docs.python.org/2/library/multiprocessing.html#shared-ctypes-objects), which creates values and arrays in shared memory. This means that all child processes can read and write to these locations in memory without communication overhead, just the normal concurrency issues.

Once the arrays are created, I usually process them with `Pool.map`, and give the worker function `(pool_rank, pool_size)` arguments so each process can safely work on a section of the array without concurrency issues.

```
import multiprocessing as mp
poolSize = mp.cpu_count()
p = mp.Pool(poolSize)
p.map(worker, [(rank, poolSize) for rank in range(poolSize)])
p.close()
p.join()
```

However, I thought there might be a more elegant way to achieve this. After some digging, I found that each child process spawned in the Pool can be detected

```
curProc = multiprocessing.current_process()
```

and then identified

```
curProc._identity[0]
```

I decided to test this method of process rank detection, where the only function argument is the process pool size.

## First Version

I created a simple `myPID` function to return the processor rank from the multiprocessing API.

```python
import multiprocessing as mp

def myPID():
	# Returns relative PID of a pool process
	return mp.current_process()._identity[0]
def helloWorker(np):
	# np = number of processes in pool
	pid = myPID()
	print("Hello from process %i of %i"%(pid, np))
	# do actual work
	return 0

# Create a pool of 8 processes, and run helloWorker
poolSize = 8
p = mp.Pool(np)
ret = p.map(helloWorker, [poolSize]*poolSize)
p.close()
p.join()
```

#### Output

While this code looked cleaner, you'll notice that the pool used process 1 twice for execution. If I had used this for operation on an array, two chunks would have been operated on twice, while the last (8th) chunk would have been untouched.

```
Hello from process 1 of 8
Hello from process 2 of 8
Hello from process 3 of 8
Hello from process 4 of 8
Hello from process 5 of 8
Hello from process 6 of 8
Hello from process 1 of 8
Hello from process 7 of 8
```

## Second Version

To stop a process from being reused the process Pool can be initialized with the [`maxtasksperchild`](https://docs.python.org/2/library/multiprocessing.html#multiprocessing.pool.multiprocessing.Pool) argument. When set to `1`, a process will never be reused. In cases when there are more chunks of work than processes, new processes will be spawned.

```python
import multiprocessing as mp

def myPID():
	# Returns relative PID of a pool process
	return mp.current_process()._identity[0]
def helloWorker(np):
	# np = number of processes in pool
	pid = myPID()
	print("Hello from process %i of %i"%(pid, np))
	# do actual work
	return 0

# Create a pool of 8 processes, and run helloWorker
np = 8
p = mp.Pool(np, maxtasksperchild=1)
ret = p.map(helloWorker, [np]*np)
p.close()
p.join()
```

#### Output

You can see that each process is run exactly once after specifying `maxtasksperchild=1`.

```
Hello from process 1 of 8
Hello from process 2 of 8
Hello from process 3 of 8
Hello from process 4 of 8
Hello from process 5 of 8
Hello from process 6 of 8
Hello from process 7 of 8
Hello from process 8 of 8
```

## Comparing Both

As a final test, I decided to compare both methods.

```python
import multiprocessing as mp

def myPID():
	# Returns relative PID of a pool process
	return mp.current_process()._identity[0]
def helloWorker(np):
	# np = number of processes in pool
	pid = myPID()
	print("Hello from process %i of %i"%(pid, np))
	# do actual work
	return 0

# Create a pool of 8 processes, and run helloWorker
np = 8
print("Default method that breaks indexing")
p = mp.Pool(np)
ret = p.map(helloWorker, [np]*np)
p.close()
p.join()

print("Using maxtasksperchild ensures that processes are not reused")
p = mp.Pool(np, maxtasksperchild=1)
ret = p.map(helloWorker, [np]*np)
p.close()
p.join()
```

#### Output

You are probably expecting this to work without issue.

```
Default method that breaks indexing
Hello from process 1 of 8
Hello from process 2 of 8
Hello from process 3 of 8
Hello from process 4 of 8
Hello from process 5 of 8
Hello from process 6 of 8
Hello from process 1 of 8
Hello from process 7 of 8
Using maxtasksperchild ensures that processes are not reused
Hello from process 9 of 8
Hello from process 10 of 8
Hello from process 11 of 8
Hello from process 12 of 8
Hello from process 13 of 8
Hello from process 14 of 8
Hello from process 15 of 8
Hello from process 16 of 8
```

Even though I terminate all child processes between pools with `p.join()`, the process rank is never reset between pools. This means that while my first version of manually passing rank and size was not pretty, it was the most reliable.
