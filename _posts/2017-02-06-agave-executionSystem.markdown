---
layout: post
title:  "Using your own cluster with CyVerse"
date:   2016-08-25
categories: AgaveAPI Agave CyVerse developer
---
<script>
var systemVals = ["id", "host"];
function gVal(id) {
	return document.getElementById(id).value
}
function updateJSON() {
	// Create systemJSON
	var systemJSON = {};
	systemJSON.id = gVal("id");
	// Insert JSON into HTML
	document.getElementById("outJSON").innerHTML = JSON.stringify(systemJSON, null, 2);
}
</script>

The [CyVerse SDK](https://github.com/cyverse/cyverse-sdk) currently guides developers through the process of creating apps that run on [TACC](https://www.tacc.utexas.edu/) supercomputers, which requires both a TACC account and active alloction. For users without an active allocation, they can [request to be added](https://github.com/cyverse/cyverse-sdk/blob/dee56dfbd6e18ef25066a4acec66ba834242b827/docs/iplant-assumptions.md) to the iPlant-Collabs allocation, which allows developers to *prototype* CyVerse applications. While this methodology allows for the creation of new apps, they actually need to be made public to take advantage of the much larger CyVerse allocation, which an only be done by an administrator. To circumvent this constraint, or to simply utilized resources provided by your institution, you can actually register your own [executionSystem](http://developer.agaveapi.co/#execution-systems) to run apps on, which will be accessible through the CyVerse Discovery Environment.

I am still a student at Indiana University, so I will be registering [Mason](https://kb.iu.edu/d/bbhh) as an *executionSystem* to be used with my CyVerse applications. Mason is [available](https://kb.iu.edu/d/bbhh#account) to all

- IU students, staff, and faculty
- NSF-funded life sciences researchers
- XSEDE researchers

The fact that [each of the 18 nodes](https://kb.iu.edu/d/bbhh#info) also has 512GB of RAM, makes the system highly accessible and desireable for running memory-hungry software. To create this and any other executionSystem, you will need

- [Login credentials](#login-credentials)
- [Knowledge on how jobs are scheduled](#scheduler-information)
- [System information](#system-information)
- [Storage paths for jobs](#storage-paths)

To make creation easier, I will be providing forms in each section below, which will populate a final JSON executionDescription, which you can upload to agave.

## Login Credentials

Whenever you launch a job on CyVerse, Agave uses the CyVerse credentials to access TACC systems to run jobs. Similarly, Agave stores and uses your own personal credentials when running private applications on systems. So, to register a new *executionSystem*, you first need a way to access it. I usually access Mason using ssh with the command

```shell
ssh username@mason.indiana.edu
```

and then entering my password when prompted. Agave will need your

| Description | Value |
|--|--|
| System Name | <input type="text" id="id" style="width:200px; box-sizing:border-box;" value="my-mason-system" oninput="updateJSON()"> |
| SSH address | <input type="text" id="host" style="width:200px; box-sizing:border-box;" value="mason.indiana.edu"> |
| Username | <input type="text" id="username" style="width:200px; box-sizing:border-box;"> |
| Password | <input type="password" id="password" style="width:200px; box-sizing:border-box;"> |

## Scheduler Information

When Agave runs a job on CyVerse, it submits a job to the SLURM schedulers at TACC. Agave needs to know what scheduler your cluster runs, which queue, and any other necessary accounting information.

| Description | Value |
|--|--|
| Scheduler | <select id="scheduler"><option value="SLURM">SLURM</option><option value="LSF">LSF</option><option value="LOADLEVELER">LOADLEVELER</option><option value="PBS">PBS</option><option value="SGE">SGE</option><option value="FORK">FORK</option><option value="COBALT">COBALT</option><option value="TORQUE">TORQUE</option><option value="MOAB">MOAB</option></select> |
| Max Jobs | <input type="number" id="maxJobs" min="-1" max="100" value="50"> |
| Queue | <input type="text" id="queue" style="width:200px; box-sizing:border-box;" value="normal"> |
| Max Nodes | <input type="number" id="maxNodes" min="-1" max="1000" value="18"> |
| Max Runtime (hours) | <input type="number" id="runtime" min="-1" max="120" value="48"> |
| Custome queue directives | <input type="text" id="directives" style="width:200px; box-sizing:border-box;" value="normal"> |

You technically can register a signal workstation to Agave by setting the *executionType* to `CLI`, but this guide is looking to enable large-scale computing, so we're going to focus on registering a cluster.

## System Information

Agave also needs information about the compute nodes in your desired queue so resources cannot be overrequested.

| Description | Value |
|--|--|
| Max Processors per Node | <input type="number" id="maxPPN" min="-1" max="128" value="32"> |
| Max Memory per Node (GB) | <input type="number" id="maxMEM" min="-1" max="4000" value="512"> |

## Storage Paths

Before a job is submitted to a scheduler, Agave first stages all app (binaries) and input data in a unique folder for each job run. This folder is created in a location relative to a directory you choose.
Our home path should be set to our `$HOME` directory so Agave can find our `.bashrc` and properly load our environment.
We should also set our scratch path to a directory with a lot of storage and capable of handling a lot of activity. I am going create an `Agave` folder in my [Data Capacitor](https://kb.iu.edu/d/avvh) directory for jobs to run in.

| Description | Value |
|--|--|
| Home path | <input type="text" id="home" style="width:200px; box-sizing:border-box;" value="/N/u/user/Mason"> |
| Scratch path | <input type="text" id="scratch" style="width:200px; box-sizing:border-box;" value="/N/dc2/scratch/user/Agave"> |

<div class="language-json highlighter-rouge"><pre class="highlight"><code id="outJSON"></code></pre></div>

```json
{
  "maxSystemJobs": 2147483647,
  "workDir": "",
  "scratchDir": "",
  "type": "EXECUTION",
  "id": "stampede.tacc.utexas.edu",
  "description": "Stampede is intended primarily for parallel applications scalable to tens of thousands of cores.  Normal batch queues will enable users to run simulations up to 24 hours.  Jobs requiring run times and more cores than allowed by the normal queues will be run in a special queue after approval of TACC staff.  Serial and development queues will also be configured. In addition, users will be able to run jobs using thousands of the Intel Xeon Phi coprocessors via the same queues to support massively parallel workflows.",
  "name": "TACC Stampede",
  "login": {
    "port": 22,
    "protocol": "SSH",
    "host": "login6.stampede.tacc.utexas.edu",
    "proxy": null,
    "auth": {
      "type": "SSHKEYS"
    },
    "proxyTunnel": "NO"
  },
  "maxSystemJobsPerUser": 2147483647,
  "site": "tacc.xsede.org",
  "status": "UP",
  "scheduler": "SLURM",
  "startupScript": "./bashrc",
  "available": true,
  "default": false,
  "environment": "",
  "owner": "dooley",
  "executionType": "HPC",
  "globalDefault": false,
  "queues": [
    {
      "maxProcessorsPerNode": 512,
      "default": false,
      "maxMemoryPerNode": "32GB",
      "mappedName": "gpu",
      "description": null,
      "name": "gpu",
      "maxRequestedTime": "48:00:00",
      "maxJobs": 25,
      "customDirectives": "-A iPlant-Master",
      "maxNodes": 32,
      "maxUserJobs": 5
    },
    {
      "maxProcessorsPerNode": 4096,
      "default": true,
      "maxMemoryPerNode": "32GB",
      "mappedName": "normal",
      "description": null,
      "name": "normal",
      "maxRequestedTime": "48:00:00",
      "maxJobs": 25,
      "customDirectives": "-A iPlant-Master",
      "maxNodes": 256,
      "maxUserJobs": 5
    },
    {
      "maxProcessorsPerNode": 16,
      "default": false,
      "maxMemoryPerNode": "32GB",
      "mappedName": "serial",
      "description": null,
      "name": "serial",
      "maxRequestedTime": "48:00:00",
      "maxJobs": 6,
      "customDirectives": "-A iPlant-Master",
      "maxNodes": 1,
      "maxUserJobs": 3
    },
    {
      "maxProcessorsPerNode": 128,
      "default": false,
      "maxMemoryPerNode": "1000GB",
      "mappedName": "largemem",
      "description": null,
      "name": "largemem",
      "maxRequestedTime": "48:00:00",
      "maxJobs": 2,
      "customDirectives": "-A iPlant-Master",
      "maxNodes": 4,
      "maxUserJobs": 1
    },
    {
      "maxProcessorsPerNode": 256,
      "default": false,
      "maxMemoryPerNode": "32GB",
      "mappedName": "development",
      "description": null,
      "name": "development",
      "maxRequestedTime": "48:00:00",
      "maxJobs": 1,
      "customDirectives": "-A iPlant-Master",
      "maxNodes": 16,
      "maxUserJobs": 1
    }
  ],
  "public": true,
  "storage": {
    "mirror": false,
    "port": 22,
    "homeDir": "/",
    "protocol": "SFTP",
    "host": "login6.stampede.tacc.utexas.edu",
    "proxy": null,
    "rootDir": "/scratch/0004/iplant",
    "auth": {
      "type": "SSHKEYS"
    },
    "proxyTunnel": "NO"
  }
}
```
