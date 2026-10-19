# BIOL 130 Interactive

Interactive study modules for BIOL 130: Introductory Cell Biology at the University of Waterloo. Each module turns one unit of the course notes into figures you can click, experiments you can run and simulations you control. A mini exam at the end of each module shows you what to relearn, and a midterm prep page pulls everything together.

**Live site:** https://manaall.github.io/biol130-interactive-/

## What's here

| Page | What it covers |
|---|---|
| `index.html` | Landing page: all modules, your progress, a question of the day |
| `module-1.html` | Introduction to Cell Biology and the Cell Theory |
| `module-2.html` | Molecules of Life |
| `module-3.html` | Cell Border Control: Cells and Membranes |
| `module-4.html` | Nucleic Acids and Information Flow |
| `midterm.html` | Midterm prep for Modules 1 to 5 |

Module 5 (Protein Structure, Function and Synthesis) will be added once its notes are ready. Its review questions are already on the midterm page.

## Inside each module

- **Chapters** that follow the course notes, with page references. Each opens with a figure, experiment or simulation, then tests you. Your score is the share you get right on the first try, and your best is saved so you can replay and beat it.
- **A free-explore view** (cell atlas, molecule lab or viewer) where you can click through every structure.
- **Endless practice** with randomized questions.
- **A mini exam** that works like a real test: no feedback until you submit. Then you get a breakdown by chapter, a list of what to relearn with links back to those chapters, and an explanation for every question.
- **A glossary** of every term, marked not yet seen, seen or tested, with the notes page.

## Midterm prep

- **Practice midterm** drawn from every module's mini exam. Pick which modules to include and how long it is.
- **All of the prof's review questions** for Modules 1 to 5, each with an answer you can check yourself against and a self-rating (got it, shaky, no idea).
- **My study plan**, built from your exam results and ratings, pointing to the exact chapters to go back to.
- A countdown to your exam date.

## Kip

Kip is a kinesin, the motor protein that walks along microtubules carrying cargo to where it's needed. Here Kip carries your questions to the right page of the notes. Kip sits in the corner of every page and can:

- explain any term or idea from the course, with the notes page
- compare two terms side by side
- quiz you one question at a time
- tell you what to study next, based on your results

Kip works offline by searching the course material in `studydata.js`. Optionally, a Claude API key can be added in Kip's settings (⚙) so Kip can also explain things in its own words. The key is stored only in your browser and sent only to Anthropic.

## Files

```
index.html       landing page
module-1.html    to module-4.html, one page per module
midterm.html     midterm prep
studydata.js     shared data: glossary, mini exam questions, review questions and answers
exam.js          the mini exam and practice midterm engine
kip.js           Kip, the study guide
README.md        this file
```

Plain HTML, CSS and JavaScript with no build step. Every page works in any modern browser, laptop first, phone second.

## Privacy

No accounts and no tracking. Progress, scores and ratings are saved only in your own browser and can be reset from each module's home page.

## Sources

- BIOL 130 course notes, University of Waterloo
- Morris, J. et al. (2023). *Biology: How Life Works* (4th ed.). Macmillan Learning.
- Clark, M. A., Douglas, M., and Choi, J. (2018). *Biology 2e*. OpenStax.

All figures are original drawings in the style of textbook figures.

## Disclaimer

An independent study aid, not an official University of Waterloo resource. Always check details against the course notes and LEARN.

## Author

Manaal Lakhani, Honours Sciences @ UWaterloo. Built with the help of Claude (Anthropic) for design and coding.
