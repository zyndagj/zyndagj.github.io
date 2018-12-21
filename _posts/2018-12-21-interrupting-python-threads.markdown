---
layout: post
title:  "Interrupting Python Threads"
date:   2018-12-21
categories: python developer threading
---

In my most recent project, [rgc](https://github.com/zyndagj/rgc), I have been using the [python threading library](https://docs.python.org/3.7/library/threading.html) for concurrent operations. 
Python Threads are often overlooked because the python [GIL](https://docs.python.org/2/glossary.html#term-global-interpreter-lock) forces them to share a single CPU core, but they are great for scaling I/O or subprocess calls without worrying about communication.

Things were running fine, but whenever I wanted to kill and restart my script, a simple `Ctrl+C` would not force it to exit.
I had to background (`Ctrl+Z`) the process, and send a kill signal to the specific process ID (`kill -9 [PID]`) after looking it up.

Below is a simple script to demonstrate this issue. The main function spawns a (sleepy) thread that loops through work (sleep).

```python
{% include kill_threads/thread_stuck.py %}```

If you run the script and try to interrupt it with `Ctrl+C` before it is done executing, you'll see output similar to this.

```
{% include kill_threads/thread_stuck.log %}```

### Making a functional example

I discovered that the `Thread.join()` function not only blocks until the thread finishes, but it also ignores the `KeyboardInterrupt` signal.
To get the program to exit, we need to modify our code to do two things:

1. Catch and communicate the interrupt signal to the child thread with an attribute
2. While the child thread is still active, try to join with a set timeout

First, when the sleepy thread is spawned, it uses the [threading.current_thread()](https://docs.python.org/3.7/library/threading.html#threading.current_thread) to retrieve a pointer to its own [Thread](https://docs.python.org/3.7/library/threading.html#thread-objects) object.
With this object, Threads can read and modify their own attributes, so we can initialize an `alive=True` attribute.
Then, whenever the thread starts another unit of work, have it exit if `alive` is `False`.

In the main function, we first need to catch the `KeyboardInterrupt` with [try and except statements](https://docs.python.org/3/tutorial/errors.html#handling-exceptions).
In the try section, we want to try to join the child thread every half a second until it is no longer alive with a while loop.
This half-second timeout allows for our interrupt signal to be processed.
If the `KeyboardInterrupt` signal is received, the thread's `alive` attribute is set to `False`, signaling that work needs to stop.
After the thread stops working it is joined back and the main process can exit.

```python
{% include kill_threads/thread_killable.py %}```

If you run this code, you can see that it is now possible cleanly exit with `Ctrl+C`.

```
{% include kill_threads/thread_killable.log %}```

I recommend utilizing this functionality for interruptible python threads in your own code.
Just note that this only works when each thread works through multiple chunks of work either through a [Queue](https://docs.python.org/3/library/queue.html) or a loop.