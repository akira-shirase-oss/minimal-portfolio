+++
title = "Model engineering from the beginning"
description = "Learning how models are built, trained, tested, and improved, starting with one adjustable number."
weight = 1
sort_by = "weight"
template = "learning-track.html"
page_template = "learning-page.html"

[extra]
status = "learning in progress"
roadmap = "@/learn/model-engineering/roadmap.md"

[[extra.chapters]]
number = 1
title = "Weights, predictions, and loss"
page = "@/learn/model-engineering/weights-predictions-and-loss.md"

[[extra.chapters]]
number = 2
title = "Gradients and weight updates"

[[extra.chapters]]
number = 3
title = "Our first training loop"

[[extra.chapters]]
number = 4
title = "How learning goes wrong"

[[extra.chapters]]
number = 5
title = "Data a model can learn from"

[[extra.chapters]]
number = 6
title = "From text to a tiny language model"

[[extra.chapters]]
number = 7
title = "Training runs we can inspect and resume"

[[extra.chapters]]
number = 8
title = "Adapting an existing model"

[[extra.chapters]]
number = 9
title = "The harness around the model"

[[extra.chapters]]
number = 10
title = "Evaluation and model promotion"

[[extra.chapters]]
number = 11
title = "Memory, speed, and scale"

[[extra.chapters]]
number = 12
title = "Learning from preferences"
+++

I started with a question about training a small model to write blogs. That led to a much bigger question: **how does training even start?**

This track follows that question from the beginning. The goal is to understand the model, the data, and the code around it well enough to explain what changed and test whether it helped.

I am weak at math. I still want to understand it. The examples start small, explain every symbol, and connect the calculation to what the program is doing.

**Where things stand:** the first chapter is a worked explanation. A training program, trained model, and measured model results are still ahead.
