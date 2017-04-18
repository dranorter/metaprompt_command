#!/usr/bin/env node

var vorpal = require('vorpal')();
var tracery = require('tracery-grammar');
var chalk = require('chalk');
//var grammar = require('./grammar.js');
//var text = require('./text.js');
var fs = require('fs');

var grammar = {//TODO: More instructional prompts.
  "start" : ["What do you want to do?\nWrite a word or short phrase describing a goal which you think MetaPrompt could help you with, and press enter. The \"to goals add\" which you have as default text in your text field is a command which sends what you type after it to the \"goals\" list. You can modify this if you'd like to send to a different list; the list name you give will automatically be created if it does not already exist.\nWhen you are finished brainstorming goals, you can press the down arrow to erase the \"to goals\" command, and write \"use meta\" to get help writing prompts for the goals you've created.\nOr, if you've already created a prompt list which you want to use, you can use the command \"use <list>\" to switch to it now.\nType \"help\" if you wish to see a list of all commands.DEFAULT:to goals add"],
  "meta_text" : ["Write a prompt which will help you with the following goal: #goals1#\nWriting a prompt is a little more involved than writing a simple response. Notice that we still have the to/add command, with \"#goals1#\" as the default destination. However, a prompt can also have a default response; that is how we're helpfully filling in things for you. You'll usually want to help yourself out in the same way, giving at least a default location to send responses to a particular prompt. (You should replace (destination list) with a reasonable destination!)DEFAULT:to #goals1# send (write a prompt here!) DEFAULT: to (destination list) send"],
  "meta" : ["#[goals1:#goals#]meta_text#"]
  };

curfile = './metaprompt-session.json';
vorpal.history('metaprompt_command');
vorpal.log("Welcome to\n __  __     _        ___                    _   _ \n|  \\/  |___| |_ __ _| _ \\_ _ ___ _ __  _ __| |_| |\n| |\\/| / -_)  _/ _` |  _/ '_/ _ \\ '  \\| '_ \\  _|_|\n|_|  |_\\___|\\__\\__,_|_| |_| \\___/_|_|_| .__/\\__(_)\n                                      |_|         \n\n");

vorpal
    .command('save <file>', "Saves the prompts to a file.")
    .action(function(args, callback) {
	f = fs.openSync(args['file'], 'w');
	fs.writeSync(f,JSON.stringify(grammar));
	fs.closeSync(f);
	callback();
    });

vorpal
    .command('load <file>', "Loads prompts from a file.")
    .action( function(args, callback) {
	curfile = args['file'];
	grammar = JSON.parse(fs.readFileSync(args['file']));
	callback();
    });


// Process command line input now
vorpal.parse(process.argv);

//load the default session
try {
    grammar = JSON.parse(fs.readFileSync(curfile));
}
catch (err) {}

promptlist = "start"

prompts = tracery.createGrammar(grammar);
// Add Tracery's standard modifiers
modifiers = Object.assign(tracery.baseEngModifiers,{
    eval : function(s) {
	// Idea is to enable something functionally like ##thing##,
	// ie, flatten "thing" and then expand the result.
	return prompts.flatten("#"+s+"#");
    }
})
prompts.addModifiers(modifiers)
//TODO: Add a ".body" modifier which grabs *just the body* of a prompt, ignoring stuff after DEFAULT: or after other tags we migt use (such as COUNT: to count how many times it's been used) (using grammar.addModifiers)

p = prompts.flatten("#"+promptlist+"#");

// Give a prompt
prompttext = p.split("DEFAULT:")[0];
vorpal.log(prompttext)

// Note the destination
dest = p.split(' ')[1];//TODO This only works when the zeroth token is 'to'...
//vorpal.delimiter('↩ '+dest+': ');
vorpal.delimiter(chalk.green(promptlist+':'));

// Default reply
defrep = p.split("DEFAULT:").slice(1).join("DEFAULT:");



vorpal
    .command('lists', "List the lists.")
    .action(function(args, callback) {
	this.log(Object.keys(grammar));
	callback();
    });

vorpal
    .command('prompts', "Lists all the prompts currently circulating.")
    .action(function(args, callback) {
	this.log(grammar[promptlist]);
	callback();
    });

vorpal
    .command('use <list>', "Switches to the prompt list \"list\".")
    .action(function(args, callback) {
	promptlist = args.list;
	this.log("Switching to list \""+args.list+'"');
	newPrompt();
	this.log(prompttext);
	vorpal.delimiter(chalk.green(promptlist+':'));
	callback();
    });

vorpal//TODO make this delimited by something: several "texts" should be able to be sent to the same "list".
    .command('to <list> add <text...>', "Add the text argument (which may be a prompt) to the list. Then, present a new prompt.")
    .alias('to <list> send <text...>')
    .action( function(args, callback) {
	//TODO Add autocomplete for available lists
	if (Object.keys(grammar).includes(args.list)) {
	    //I do the ".slice(1)" thing because "add" keeps being included.
	    grammar[args.list] = grammar[args.list].concat([args.text.slice(1).join(' ')]);
	} else {
	    grammar[args.list] = [args.text.slice(1).join(' ')];
	}
	//this.log('test');
	newPrompt();
	this.log(prompttext);
	callback();
    });

vorpal
    .command('redraw',"Give a new randomly selected prompt, discarding the current one.")
    .alias('new')
    .action( function(args, callback) {
	newPrompt();
	this.log(prompttext);
	callback();
    });


/*
//TODO: What should the behavior be when the command is dropped?
//      I could keep track of a default list to send stuff to,
//      basically the most recent used or the most recent default;
//      but would that really be intuitive?
vorpal
    .catch('[text...]', "Handles responses to prompts")
	.action(function(args, callback) {
	    // TODO This needs to not break when a prompt is formatted wrong.
	    //    (ie, missing the syntax)

	    // Add a new expansion rule to 'dest' symbol
	    if (Object.keys(grammar).includes(dest)) {
		grammar[dest] = grammar[dest].concat([args.text.join(' ')]);
	    } else {
		grammar[dest] = [args.text.join(' ')];
	    }
	    newPrompt();
	    this.log(prompttext)
	    callback();
	});
*/

function newPrompt() {
    prompts = tracery.createGrammar(grammar);
    prompts.addModifiers(modifiers)
    p = prompts.flatten("#"+promptlist+"#");
    // Say it...
    prompttext = p.split("DEFAULT:")[0]
    // Note new dest. TODO: should we be keeping track of a default destination?
    //dest = p.split("PROMPT")[1].split("DESTINATION:")[1].split("DEFAULT:")[0];
    //vorpal.delimiter('↩ '+dest+': ');
    // Default reply
    defrep = p.split("DEFAULT:").slice(1).join("DEFAULT:");
    // We trigger a custom event to set the default up.
    vorpal.emit('gonna_callback')
    return prompttext;
};

vorpal.on('client_command_executed', function() {
    //TODO reiterate prompt text?
    //     If so, remove it from the other place
    setTimeout(function() {
	vorpal.ui.input(defrep)
    }, 10);// Will 10 seconds always be enough??
});

vorpal.on('gonna_callback', function() {
    setTimeout(function() {
	//Set default response now.
	vorpal.ui.input(defrep)
	// Also save current session.
	f = fs.openSync(curfile, 'w');
	fs.writeSync(f,JSON.stringify(grammar));
	fs.closeSync(f);
    }, 10);// Will 10 seconds always be enough??????
});

//vorpal.delimiter('🔀');

vorpal
    .show()
// now we can fill in the first default reply
    .ui.input(defrep);

