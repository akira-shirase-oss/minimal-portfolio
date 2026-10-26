+++
title = "Five lessons from PHP2Shell, PingCAP, Railway and the AGENTS.md hijack"
description = "A bitcoin dare, PHP2Shell, the PingCAP breach, Railway's leaked secrets and the AGENTS.md hijack: five lessons from one bad week, checked against the CMS I'm building."
date = 2026-10-26T13:15:00Z

[extra]
# The link preview for this post (made from art/cards/php2shell-pingcap-railway-agents-md-lessons.html).
card = "img/cards/php2shell-pingcap-railway-agents-md-lessons.jpg"
card_alt = "Five lessons from a bad week for the web: PHP2Shell, PingCAP, Railway, AGENTS.md and the steal-my-bitcoin challenge, checked against the CMS I'm building."
+++

On Sunday, someone put about $2,000 of bitcoin on a web server and dared the internet to take it.

The server ran a version of PHP with two freshly announced security holes in it. A timer on the page counted the hours since the dare began, to test whether the panic about those holes was
[overblown](https://x.com/hackerfantastic/status/2114358107283620060).

For its first hours, the timer meant nothing. LiveOverflow, a security researcher, noticed the server
[was handing out a plain, fixed page](https://x.com/LiveOverflow/status/2114308386292461842). There was no PHP behind it
to attack.

Once a real PHP page went up, a researcher called killa broke in within hours. Then the twist: the key on the server
belonged to the wrong wallet. The creator [owned up to it](https://x.com/JamesPavur/status/2114501212313653696) with
good humour.

It was a fun end to a rough week. I'm building a CMS, [Colophon](@/colophon/_index.md), the kind of software that
stores and publishes a website's content. So I read each incident with one question: would my own code have done any
better? Here's what I found, including the places where the answer is "no" or "not yet".

## 1. The steal-my-bitcoin challenge: a test that can't fail tells you nothing

The timer looked like evidence. For hours, it was measuring a door with no lock behind it.

I've built that timer myself. In step 1.4, the first test I wrote to prove a bug was fixed
[passed on the old code too](@/colophon/checkpoint-1-4.md), so it proved nothing. In step 2.1, my first load test had
every simulated user review the same item, so I [measured a queue](@/colophon/checkpoint-2-1.md), not the code.

What I do now is break things on purpose. Colophon has a simulator: a program that plays out thousands of chaotic
editing sessions and checks that no saved work goes missing. Before trusting it, I planted four bugs (one turned out
to be a real bug in my editor). It caught all four, each on the very first run it tried.

**The lesson:** before you trust a test, watch it fail once.

## 2. PHP2Shell: the hole was under the CMS

The holes in that bitcoin server have a name: [PHP2Shell](https://wiz.io/blog/php2shell-php-rce). Researchers at Wiz
found them in PHP itself, the language underneath WordPress, Drupal, Joomla and a big share of the web.

In plain words: if PHP ran out of memory at exactly the wrong moment, it could be left with half-finished internal
paperwork. A later request could then use that mess to run the attacker's own commands, with no password needed. Wiz
showed it working against the latest WordPress, Drupal and Joomla.

PHP shipped fixes on 21 October: versions 8.5.12, 8.4.27, 8.3.36 and 8.2.35. Amazon says it
[saw someone trying the attack](https://www.thestreet.com/technology/amazon-caught-hackers-probing-php-vulnerabilities)
on 17 October, four days earlier.
[Canadian government sites went offline](https://www.cbc.ca/news/business/canadian-government-sites-down-php-cybersecurity-9.7390368)
while they patched. By 26 October, decoy servers set up to be attacked had caught
[working break-ins](https://bleepingcomputer.com/news/security/php2shell-security-flaws-now-sucessfully-exploited-in-the-wild).

The trap: updating WordPress fixes none of this. The hole is in the layer below, so PHP itself has to be updated, and
its running workers restarted.

Colophon's server is written in Rust. Rust refuses to compile ordinary code that misuses memory like this, so this
particular kind of bug is much harder to write. That's a real advantage. It isn't a force field.

Colophon still sits on a database, an operating system and dozens of libraries written by other people. Its CI (the
robot that checks every change) compares every Rust library it uses against the public list of known security holes,
on every change and once a day, because new holes get announced without anyone touching the code.

**What it doesn't do yet:** there's no matching check for the editor's JavaScript packages, and nothing in the project
watches PostgreSQL or the operating system underneath. That's still on me.

**The lesson:** know every layer you run, and which one needs the patch.

## 3. The PingCAP breach: one key that opened too much

[PingCAP](https://www.pingcap.com/trust-hub/security/security-update-october-2026/), the company behind the TiDB
database and its cloud service, said someone used stolen service-account credentials between 9 September and
7 October. A service account is the login one program uses to talk to another, not a person's login.

With it, the intruder copied source code and customer records: names, email addresses, text people had typed into the
SQL editor, billing details, and a table of encrypted API keys. PingCAP says there's no evidence that data stored in
customers' databases was touched. An extortion group claims much more; none of that is confirmed.

How the key was stolen matters. But so does a second question: how much could one key open?

In Colophon, each part gets the smallest key that does its job. The code that serves the public website reads through
a database account that can see published content and
[nothing else](@/colophon/checkpoint-2-2.md): no drafts, no members, no sign-ins, no writing. Even if that code had a
bug, the database itself would refuse to hand over a draft.

The web server's own database account can't make anyone an administrator. Only the person running the server can, once,
from a terminal, and [the database enforces that](@/colophon/checkpoint-1-8.md).

**What it doesn't do yet:** anyone with the database owner's password can still change anything. Every system has a
master key somewhere. Mine is just smaller than "everything the web server can reach".

**The lesson:** assume one key will leak, and decide in advance how little it opens.

## 4. Railway: don't keep secrets you only need to check

[Railway](https://www.bleepingcomputer.com/news/security/railway-warns-devs-to-rotate-secrets-after-potential-breach/),
a hosting platform, said an intruder may have read customers' environment variables, the settings where apps keep
passwords and API keys, and decrypted some of them. Every user was told to replace every secret, and deploys were
paused during the investigation.

Some secrets have to be stored, like an API key you send to another service. But many secrets only ever need to be
*checked*, like a password at the door. For those, you can keep a fingerprint instead of the secret.

A fingerprint here is a hash: a one-way scramble. It's easy to check a key against it, and useless for getting in.
Steal the whole table and you have nothing to log in with.

That's how Colophon handles the command line's sign-in tokens: [stored hashed](@/colophon/checkpoint-1-6.md). The
invitation links work the same way, with one more trick. Their secret part comes after the `#` in the address, and
browsers never send that part to a server, so it [can't end up in a log](@/colophon/checkpoint-1-7.md) somewhere.

**What it doesn't do yet:** when Colophon starts calling out to other services, it will need real credentials for
them, and those can leak like anyone's.

**The lesson:** if you only need to check a secret, don't keep it.

## 5. The AGENTS.md hijack: instruction files are code now

Forever Security found a booby-trapped
[AGENTS.md](https://www.bleepingcomputer.com/news/security/ai-coding-agents-hijacked-using-agentsmd-file-in-downloads-folder/)
in a customer's Downloads folder. That's a plain text file of instructions that AI coding agents read when they start.
The customer had started their agent in Downloads, it followed the file, and it tried to install a rogue package.

In the researchers' tests, a harmless stand-in payload ran on OpenAI's Codex about 90% of the time. A similar trick
with a CLAUDE.md file leaked a Claude Code login token. The researchers say there's nothing for the vendors to patch:
the agents did exactly what they're built to do.

This one is personal. I build Colophon with Claude Code, and the project's rules live in an AGENTS.md in its
repository. So I checked my own setup.

My sessions start in a folder above all my projects. It isn't Downloads, but it's wider than it needs to be,
and Claude Code [also reads instruction files](https://code.claude.com/docs/en/memory) from every folder above the one
it starts in. Every file in that chain is effectively code I'm running.

**The lesson:** read instruction files like code, and start an agent in the smallest folder that does the job.

## What this doesn't prove

None of this makes Colophon safe. Nobody has attacked it yet, it isn't released, and every load number in the build log
comes from one laptop.

What it does mean is that some of these mistakes would have to get past the database, not just past me. That's the
whole bet: write the rules down where the machine enforces them, then try hard to break them.

And if I ever put bitcoin on a server, I'll check which key is on it first.
