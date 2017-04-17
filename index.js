#!/usr/bin/env node

var vorpal = require('vorpal')();
var tracery = require('tracery-grammar');
//var grammar = require('./grammar.js');
//var text = require('./text.js');
var fs = require('fs');

var grammar = {
    "meta" : ["PROMPT:What do you want to do?\nWrite a prompt which tells you to write a prompt which tells you to do that thing.DESTINATION:metaDEFAULT:PROMPT:Your command to write a command goes hereDESTINATION:metaDEFAULT:", "PROMPT:What do you want to do?\nWrite a prompt which tells you to do it.DESTINATION:metaDEFAULT:PROMPT:thing to do goes hereDESTINATION:???DEFAULT:"]
};

curfile = '~/metaprompt-session.json';
vorpal.history('metaprompt_command');
vorpal.log("Welcome to\n __  __     _        ___                    _   _ \n|  \/  |___| |_ __ _| _ \_ _ ___ _ __  _ __| |_| |\n| |\/| / -_)  _/ _` |  _/ '_/ _ \ '  \| '_ \  _|_|\n|_|  |_\___|\__\__,_|_| |_| \___/_|_|_| .__/\__(_)\n                                      |_|         \n\n")

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
    .action( (args, callback) => {
	curfile = args['file'];
	grammar = JSON.parse(fs.readFileSync(args['file']));
	callback();
    });

vorpal
    .command('lists', "List the lists.")
    .action(function(args, callback) {
	this.log(Object.keys(grammar));
	callback();
    });

vorpal
    .command('prompts', "Lists all the prompts currently circulating.")
    .action(function(args, callback) {
	this.log(grammar["meta"]);
	callback();
    });

vorpal
    .command('use <list>', "Switches to the prompt list \"list\".")
    .action(function(args, callback) {
	promptlist = args[0];
	callback();
    });

// Process command line input now
vorpal.parse(process.argv);

//load the default session
try {
    grammar = JSON.parse(fs.readFileSync(curfile));
}
catch (err) {}

promptlist = "meta"

prompts = tracery.createGrammar(grammar);
p = prompts.flatten("#"+promptlist+"#");

// Give a prompt
prompttext = p.split("PROMPT:")[1].split("DESTINATION:")[0]
vorpal.log(prompttext)

// Note the destination
dest = p.split("PROMPT")[1].split("DESTINATION:")[1].split("DEFAULT:")[0];
vorpal.delimiter('↩ '+dest+': ');

// Default reply
defrep = p.split("DEFAULT:").slice(1).join("DEFAULT:");


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
	    //this.log(args.text.join(' '));
	    // Now we need a new prompt. Recalculate...
	    prompts = tracery.createGrammar(grammar);
	    p = prompts.flatten("#"+promptlist+"#");
	    // Say it...
	    prompttext = p.split("PROMPT:")[1].split("DESTINATION:")[0]
	    vorpal.log(prompttext)
	    // Note new dest
	    dest = p.split("PROMPT")[1].split("DESTINATION:")[1].split("DEFAULT:")[0];
	    vorpal.delimiter('↩ '+dest+': ');
	    // Default reply
	    defrep = p.split("DEFAULT:").slice(1).join("DEFAULT:");

	    // We trigger a custom event to set the default up.
	    vorpal.emit('gonna_callback')
	    callback();
	});





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

