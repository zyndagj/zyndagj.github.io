#!/usr/bin/env python

from threading import Thread, current_thread
from time import sleep
import sys

def main():
	# Spawn a new thread that runs sleepy
	t = Thread(target=sleepy, args=(0,))
	try:
		# Start the thread
		t.start()
		# If the child thread is still running
		while t.is_alive():
			# Try to join the child thread back to parent for 0.5 seconds
			t.join(0.5)
	# When ctrl+c is received
	except KeyboardInterrupt as e:
		# Set the alive attribute to false
		t.alive = False
		# Block until child thread is joined back to the parent
		t.join()
		# Exit with error code
		sys.exit(e)

def sleepy(t_id, n_loops=5):
	'''
	Thread function
	'''
	# Local reference of THIS thread object
	t = current_thread()
	# Thread is alive by default
	t.alive = True
	for i in range(n_loops):
		# If alive is set to false
		if not t.alive:
			print("Thread-%i detected alive=False"%(t_id))
			# Break out of for loop
			break
		print("Thread-%i sleeping %i/%i"%(t_id, i+1, n_loops))
		sleep(2)
		print("Thread-%i finished sleeping"%(t_id))
	# Thread then stops running
	print("Thread-%i broke out of loop"%(t_id))


if __name__ == "__main__":
	main()
