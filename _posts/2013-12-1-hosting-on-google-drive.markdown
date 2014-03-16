---
layout: post
title:  "Hosting on Google Drive"
date:   2013-12-01 23:39:52
categories: webdev google
---

I originally wanted to host this site completely on Google Drive using the method laid out at: [GoogleDriveHosting](https://googledrive.com/host/0B716ywBKT84AMXBENXlnYmJISlE/GoogleDriveHosting.html). This method was appealing because I could depend on Google's infrastructure for reliability even though I would be restricting myself to client-side scripting (HTML, CSS, and JavaScript). After some experimentation with public Drive folders, I found out that all communication was loaded over https, so I would not be able to link my domain name for security reasons.

Since I couldn't use my domain name with Google Drive, I moved the site to a dedicated server at IU. I still wanted a blog format, but instead of using CGI, I decided to host all my entries in a Google Spreadsheet. A Google Spreadsheet was ideal to host my blog since I could easily treat rows of data as individual entries and publish them in the ATOM (XML container) format. Luckily, JavaScript can parse XML data structures using the getElementsByTagName function, so formatting was simple. Right now, I'm only reading the spreadsheet in the cell format, but the [Spreadsheets API](https://developers.google.com/google-apps/spreadsheets/) allows for simple queries in the "list" format. The only issue is that this was made for numerical or single word data since it is not delivered in a standard JSON format. As I keep developing this site and my web-development skills, I hope to implement my own text markup language and work on switching to the list format.
