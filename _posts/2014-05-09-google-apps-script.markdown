---
layout: post
title:  "Functions on a Google Documents Table"
date:   2014-05-09
categories: webdev google docs script
---

Today I had to make an expense report and decided to use a Google document instead of a spreadsheet so I could embed images of all receipts as I went. I knew Google documents had tables and figured that they had simple functions like SUM. They did not. What they did have was [Google Apps Script](https://developers.google.com/apps-script/) found under Tools -> Script Editor. I had a hard time with the tutorials, but I'm sure this project is still maturing and might be dropped from Google's offerings any day. However, I did manage to make a script (with a button!) that sums dollar values in a table and prints the total in the last row.

First, I needed to make a function, so the code could be called. I called it sumTable and didn't give it any parameters.

{% highlight javascript %}
function sumTable() {
	//todo
}
{% endhighlight %}

Based on what I learned from the tutorial, this script was contained in my document and not my drive so I needed to retrieve this documents data object. After getting this specific document I could then retrieve the body portion.

{% highlight javascript %}
function sumTable() {
	var doc = DocumentApp.getActiveDocument();
	var body = doc.getBody();
}
{% endhighlight %}

This is a lot like [parsing HTML DOM elements](http://www.w3schools.com/js/js_htmldom_elements.asp) in Javascript, and all JavaScript functions I tried worked in this Apps Script sandbox. Next, I needed to actually find the table object in my document, and the examples were not helpful, but I did find a BODY object method called getTables. Instead of bothering to search through all objects and comparing it to type TABLE like in the example, I was able to retrieve a nice array of all tables. I knew that the table I wanted to work with would be the first and only table, so I selected the first (0-indexed) table in the array. Then, I used the the table function getNumRows to retrieve the number of rows in the table, so I could iterate over them.

{% highlight javascript %}
function sumTable() {
	var doc = DocumentApp.getActiveDocument();
	var body = doc.getBody();

	var tables = body.getTables();
	var numRows = tables[0].getNumRows();
}
{% endhighlight %}

Now that I had my table and the total number of rows contained in it, I could start pulling all the expense values. To do that, I used a for loop from row 0 to `numRows-2`. This is because the index of the last row is `numRows-1` and I didn't want that row to count towards the total because it was the total. From inside that for loop, I first selected the cell from the row the loop was on and the column of values using TABLE.getCell(row, column). Next, I got the text from that cell using getText and then sliced the string of text after the first character to remove the dollar sign.

{% highlight javascript %}
function sumTable() {
	var doc = DocumentApp.getActiveDocument();
	var body = doc.getBody();

	var tables = body.getTables();
	var numRows = tables[0].getNumRows();

	var row;
	var val;
	for(row = 0; row<numRows-1; row++) {
		val = tables[0].getCell(row, 1).getText().slice(1);
	}
}
{% endhighlight %}

Now that I could select the values in the table, I had to start adding them together. First I checked to see if `val` wasn't empty and then added the floating point value to a variable called total after converting the string into a float using the JavaScript function parseFloat.

{% highlight javascript %}
function sumTable() {
	var doc = DocumentApp.getActiveDocument();
	var body = doc.getBody();

	var tables = body.getTables();
	var numRows = tables[0].getNumRows();

	var row;
	var val;
	var total = 0.0;
	for(row = 0; row<numRows-1; row++) {
		val = tables[0].getCell(row, 1).getText().slice(1);

		if(val) {
		total += parseFloat(val);
		}
	}
}
{% endhighlight %}

Lastly, I had to write the final total in the last cell. This was done by first selecting the correct cell in the last row and then using the CELL.setText function and converting the total value to a string using the toString function.

{% highlight javascript %}
function sumTable() {
	var doc = DocumentApp.getActiveDocument();
	var body = doc.getBody();

	var tables = body.getTables();
	var numRows = tables[0].getNumRows();

	var row;
	var val;
	var total = 0.0;
	for(row = 0; row<numRows-1; row++) {
		val = tables[0].getCell(row, 1).getText().slice(1);

		if(val) {
		total += parseFloat(val);
		}
	}

tables[0].getCell(numRows-1,1).setText("$"+total.toString());
}
{% endhighlight %}

Now, when I clicked RUN in my script editor, the function would execute and update my table. The only problem was that this required me to have the document open along with the script editor open in another tab. This wasn't ideal. I went back to the tutorial and found that the documents menu could be modified, and triggers that executed upon a document opening existed as well. I then combined these to add `Sum Table` to the addon menu.

{% highlight javascript %}
function onOpen(e) {
	var menu = DocumentApp.getUi().createAddonMenu();
	menu.addItem("Sum Table", "sumTable");
	menu.addToUi();
}
{% endhighlight %}

After a few failed refreshes, I found out that `menu.addToUi()` was required to actually update the menu with any changes made. This meant that my script was complete and I could run it whenever I wanted from the menu. The actual table and specific column are hardcoded in, so it is nowhere near production, but it works for what I wanted. I also got to write this nice tutorial and hopefully make someone's life a little easier as well. In the future, I hope to turn the script into a sidebar to allow for table and column specification. Then I might actually release it for someone else to use.
