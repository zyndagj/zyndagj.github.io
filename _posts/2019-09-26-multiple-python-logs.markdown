---
layout: post
title:  "Multiple Python Logging formats"
date:   2019-09-26
categories: python developer logging
---

I have been writing a python module that utilizes threading, and I wanted it to have a specific [logging format](https://docs.python.org/3.7/library/logging.html#logging.Formatter) so messages from separate threads could be differentiated. However, when the module was imported, it inherited any (root logger) format that was specified before it.

To achieve this goal, I tried the following things:

### Setting the basicConfig

```python
# basicConfig.py

import logging
logger = logging.getLogger(__name__)
FORMAT = "[%(levelname)s - %(filename)s - %(funcName)s] %(message)s"

logging.basicConfig(level=logging.DEBUG, format=FORMAT)


def info(msg):
	logger.info(msg)
def debug(msg):
	logger.debug(msg)
def warn(msg):
	logger.warn(msg)
```

### Setting the basicConfig and disabling propagation

```python
# basicConfig_noPropagate.py

import logging
logger = logging.getLogger(__name__)
FORMAT = "[%(levelname)s - %(module)s - %(funcName)s] %(message)s"

logging.basicConfig(level=logging.DEBUG, format=FORMAT)
logger.propagate = False

def info(msg):
	logger.info(msg)
def debug(msg):
	logger.debug(msg)
def warn(msg):
	logger.warn(msg)
```

### Creating a new Handler

```python
# handler.py

import logging
logger = logging.getLogger(__name__)
FORMAT = "[%(levelname)s - %(module)s - %(funcName)s] %(message)s"

logger.setLevel(logging.DEBUG)
ch = logging.StreamHandler()
ch.setFormatter(logging.Formatter(FORMAT))
logger.addHandler(ch)

def info(msg):
	logger.info(msg)
def debug(msg):
	logger.debug(msg)
def warn(msg):
	logger.warn(msg)
```
### Creating a new Handler and disabling propagation

```python
# handler_noPropagate.py

import logging
logger = logging.getLogger(__name__)
FORMAT = "[%(levelname)s - %(module)s - %(funcName)s] %(message)s"

logger.setLevel(logging.DEBUG)
ch = logging.StreamHandler()
ch.setFormatter(logging.Formatter(FORMAT))
logger.addHandler(ch)
logger.propagate = False

def info(msg):
	logger.info(msg)
def debug(msg):
	logger.debug(msg)
def warn(msg):
	logger.warn(msg)
```

### Testing the the various methods

I then ran the following code to import and test various methods:

```python
import logging
logger = logging.getLogger(__name__)
FORMAT = "[%(levelname)s - root - %(funcName)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=FORMAT)
import basicConfig, handler, basicConfig_noPropagate, handler_noPropagate

def main():
	info("info")
	debug("debug")
	warn("warn")
	basicConfig.info("info from basicConfig")
	basicConfig.debug("debug from basicConfig")
	basicConfig.warn("warn from basicConfig")
	basicConfig_noPropagate.info("info from basicConfig_noPropagate")
	basicConfig_noPropagate.debug("debug from basicConfig_noPropagate")
	basicConfig_noPropagate.warn("warn from basicConfig_noPropagate")
	handler.info("info from handler")
	handler.debug("debug from handler")
	handler.warn("warn from handler")
	handler_noPropagate.info("info from handler_noPropagate")
	handler_noPropagate.debug("debug from handler_noPropagate")
	handler_noPropagate.warn("warn from handler_noPropagate")

def info(msg):
	logger.info(msg)
def debug(msg):
	logger.debug(msg)
def warn(msg):
	logger.warn(msg)

if __name__ == "__main__":
	main()
```

which output

```
[INFO - root - info] info
[WARNING - root - warn] warn
[INFO - root - info] info from basicConfig
[WARNING - root - warn] warn from basicConfig
No handlers could be found for logger "basicConfig_noPropagate"
[INFO - handler - info] info from handler
[INFO - root - info] info from handler
[DEBUG - handler - debug] debug from handler
[DEBUG - root - debug] debug from handler
[WARNING - handler - warn] warn from handler
[WARNING - root - warn] warn from handler
[INFO - handler_noPropagate - info] info from handler_noPropagate
[DEBUG - handler_noPropagate - debug] debug from handler_noPropagate
[WARNING - handler_noPropagate - warn] warn from handler_noPropagate
```

and tells me the following:

| Method | Printed log messages | Updated Formatter | Updated logging level | No duplicated messages |
|---|:-:|:-:|:-:|:-:|
| [`basicConfig.py`](#setting-the-basicconfig) | X | | | X |
| [`basicConfig_noPropagate.py`](#setting-the-basicconfig-and-disabling-propagation) | | | | |
| [`handler.py`](#creating-a-new-handler) | X | X | X | |
| [`handler_noPropagate.py`](#creating-a-new-handler-and-disabling-propagation) | X | X | X | X |

This means if you want your library to have a custom Formatter and level that is not overwritten, you must


```python
import logging
# Create local logger
logger = logging.getLogger(__name__)
# Define new format string
FORMAT = "[%(levelname)s - %(module)s - %(funcName)s] %(message)s"
# Set desired logging level
logger.setLevel(logging.DEBUG)
# Create new console stream (could be file too)
ch = logging.StreamHandler()
# Update the formatter of the new stream
ch.setFormatter(logging.Formatter(FORMAT))
# Add the handler to the logger
logger.addHandler(ch)
# Disable message propagation to prevent duplicate messages
logger.propagate = False
```