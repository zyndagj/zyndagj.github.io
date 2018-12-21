#!/usr/bin/env python

from threading import Thread
from time import sleep
import sys

def main():
	# Spawn a new thread that runs sleepy
	t = Thread(target=sleepy, args=(0,))
	# Start the thread
	t.start()
	# Join the child thread back to parent
	t.join()

def sleepy(t_id, n_loops=5):
	'''
	Thread function
	'''
	for i in range(n_loops):
		print("Thread-%i sleeping %i/%i"%(t_id, i+1, n_loops))
		sleep(2)

if __name__ == "__main__":
	main()
