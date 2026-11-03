# BIOL 130 Interactive

Interactive study modules for BIOL 130: Introductory Cell Biology at the University of Waterloo. All eleven modules of the course notes, each turned into readable notes, figures you can click and simulations you control. A review loop brings back whatever you're about to forget.

**Live site:** https://manaall.github.io/biol130-interactive-/

## What's here

| Page | What it covers |
|---|---|
| `index.html` | Home: today's review, before/after class shortcuts, all modules, question of the day |
| `module-1.html` to `module-11.html` | One page per module (see below) |
| `review.html` | Daily review: spaced, mixed review across every module you've covered |
| `diagrams.html` | Diagram library: every figure in course order, with a cover-the-labels quiz mode |
| `lab3d.html` | 3D lab: rotatable 3D models (cell, membrane, DNA, protein levels, mitochondrion, chloroplast, GPCR, cytoskeleton, replication fork, mitosis) |
| `midterm.html` | Exam prep: practice exam, the prof's review questions for every module with answers, study plan |

Modules:
1. Introduction to Cell Biology and the Cell Theory
2. Molecules of Life
3. Cells and Membranes
4. Nucleic Acids and Information Flow
5. Protein Structure, Function and Synthesis
6. Making Life Work: Energy and Metabolism
7. Cellular Respiration
8. Photosynthesis
9. Cell Signalling
10. Cell and Tissue Form
11. DNA Replication and Cell Division

## The study cycle

Every module page has four modes. They follow what the research on learning supports: pre-exposure, pretesting, retrieval practice, and spaced, interleaved review.

- **Read** (before class): the course notes for each chapter, cleaned up, with the blanks filled in and the figures alongside. Terms are clickable.
- **Prep** (5 minutes before class): guess at three questions before the lecture. Trying first makes the answer stick better, even when the guess is wrong. Then the big picture, the key terms, and a few questions to listen for in class.
- **Learn**: the interactive chapters, with figures, simulations and questions. Your first-try score is saved.
- **Check** (after class): write down everything you remember, compare it with the notes, then a short quiz where you say how sure you were. Anything missed or guessed is scheduled for review.

**Daily review** pulls it together. Every question, term, figure and explain-it prompt you've met has a schedule: missed means tomorrow, known means 2, 4, 8, 16 days and more. Sessions mix modules so you practise telling topics apart. Exam mode pulls from everything in the modules you choose.

Each module also has a free-explore viewer, an endless practice desk, a mini exam that feeds the review, and a glossary.

## Kip

Kip is a kinesin, the motor protein that walks along microtubules carrying cargo to where it's needed. Here Kip carries your questions to the right page of the notes. Kip walks a short microtubule in the corner of every page: drag him, flick him, or click the track to send him somewhere. Each 8 nm step costs him one ATP, and he keeps count. Tap him to open the chat, where he can:

- explain any term or idea from the course, with the notes page
- compare two terms side by side
- quiz you one question at a time
- tell you what to study next, based on your results

Kip works offline by searching the course material in `studydata.js`. Optionally, a Claude API key can be added in Kip's settings (⚙) so Kip can also explain things in its own words. The key is stored only in your browser and sent only to Anthropic.

## Files

```
index.html          home page
module-1..11.html   one page per module
review.html         daily review
diagrams.html       diagram library (figures in diagrams/)
lab3d.html          3D lab (scripts in lab3d/, three.js vendored in lab3d/vendor/)
midterm.html        exam prep
studydata.js        shared data: modules, glossary, exam questions, review questions
srs.js              the review schedule and study-mode history (stored in your browser)
modes.js            Read / Prep / Check modes on every module page
read/               the Read-mode notes for each module
exam.js             the mini exam and practice exam engine
kip.js              Kip, the study guide
hub.css             shared styles for the hub pages
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
