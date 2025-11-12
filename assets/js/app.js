(function () {

    // Mobile navigation toggle
    const navToggle = document.querySelector('.nav__toggle');
    const navLinks = document.querySelector('.nav__links');

    if (navToggle && navLinks) {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('is-open');
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!expanded));
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('is-open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Demo drag-and-drop interaction
    const demo = document.querySelector('[data-demo]');
    if (demo) {
        const tiles = demo.querySelectorAll('.demo__tile');
        const dropzones = demo.querySelectorAll('[data-dropzone]');
        const result = demo.querySelector('[data-result]');
        const checkButton = demo.querySelector('[data-check]');

        tiles.forEach(tile => {
            tile.addEventListener('dragstart', event => {
                event.dataTransfer.setData('text/plain', tile.dataset.answer || '');
                event.dataTransfer.effectAllowed = 'move';
                tile.classList.add('is-dragging');
            });

            tile.addEventListener('dragend', () => {
                tile.classList.remove('is-dragging');
            });
        });

        dropzones.forEach(zone => {
            zone.addEventListener('dragover', event => {
                event.preventDefault();
                zone.classList.add('is-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('is-over');
            });

            zone.addEventListener('drop', event => {
                event.preventDefault();
                const tile = demo.querySelector('.demo__tile.is-dragging');
                if (tile) {
                    zone.appendChild(tile);
                }
                zone.classList.remove('is-over');
                result.textContent = '';
            });
        });

        checkButton?.addEventListener('click', () => {
            const debitZone = demo.querySelector('[data-dropzone="debit"]');
            const creditZone = demo.querySelector('[data-dropzone="credit"]');
            const debitTiles = Array.from(debitZone?.children || []);
            const creditTiles = Array.from(creditZone?.children || []);

            const debitCorrect = debitTiles.every(tile => tile.dataset.answer === 'debit');
            const creditCorrect = creditTiles.every(tile => tile.dataset.answer === 'credit');
            const allPlaced = debitTiles.length + creditTiles.length === tiles.length;

            if (!allPlaced) {
                result.textContent = 'Place each account tile in a column before checking your answer.';
                result.style.color = '#f59f00';
                return;
            }

            if (debitCorrect && creditCorrect) {
                result.textContent = 'Great job! Cash increases on the debit side; revenues and liabilities increase on the credit side.';
                result.style.color = '#16a34a';
            } else {
                result.textContent = 'Not quite. Remember: assets increase with debits, while revenue and liability accounts increase with credits.';
                result.style.color = '#dc2626';
            }
        });
    }

    // Accordion for modules
    const modules = document.querySelectorAll('[data-module]');
    modules.forEach(module => {
        const header = module.querySelector('.module__header');
        const toggle = module.querySelector('.module__toggle');
        header?.addEventListener('click', () => module.classList.toggle('is-open'));
        toggle?.addEventListener('click', event => {
            event.stopPropagation();
            module.classList.toggle('is-open');
        });
    });

    // Flashcard flipping
    const flashcards = document.querySelectorAll('.flashcard');
    flashcards.forEach(card => {
        const toggleCard = () => card.classList.toggle('is-flipped');
        card.addEventListener('click', toggleCard);
        card.addEventListener('keypress', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleCard();
            }
        });
    });

    // Quiz logic
    const quiz = document.querySelector('[data-quiz]');
    if (quiz) {
        const promptEl = quiz.querySelector('.quiz__prompt');
        const choicesEl = quiz.querySelector('.quiz__choices');
        const resultEl = quiz.querySelector('[data-quiz-result]');

        const questions = [
            {
                prompt: 'Which financial statement summarizes a company\'s revenues and expenses over a period?',
                options: ['Balance Sheet', 'Income Statement', 'Statement of Retained Earnings', 'Statement of Cash Flows'],
                answer: 1,
                explanation: 'The income statement reports a company\'s performance over a time period by showing revenues and expenses.'
            },
            {
                prompt: 'Recording expenses in the same period as the related revenues follows which principle?',
                options: ['Matching Principle', 'Historical Cost Principle', 'Revenue Recognition Principle', 'Materiality Principle'],
                answer: 0,
                explanation: 'The matching principle pairs expenses with the revenues they help generate in the same period.'
            },
            {
                prompt: 'In a cash flow statement, cash paid for inventory purchases appears in which section?',
                options: ['Operating Activities', 'Investing Activities', 'Financing Activities', 'Supplemental Disclosures'],
                answer: 0,
                explanation: 'Inventory purchases are part of operating cash flows because they relate to the core business operations.'
            },
            {
                prompt: 'Which ratio measures a company\'s ability to pay its short-term obligations with its most liquid assets?',
                options: ['Current Ratio', 'Quick Ratio', 'Debt-to-Equity Ratio', 'Gross Margin Ratio'],
                answer: 1,
                explanation: 'The quick ratio (acid-test) excludes inventory to assess liquidity using only quick assets.'
            }
        ];

        const renderQuestion = () => {
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            quiz.dataset.currentQuestionIndex = questions.indexOf(randomQuestion).toString();
            promptEl.textContent = randomQuestion.prompt;
            choicesEl.innerHTML = '';
            randomQuestion.options.forEach((choice, index) => {
                const id = `choice-${index}`;
                const label = document.createElement('label');
                label.setAttribute('for', id);

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'quiz-choice';
                input.id = id;
                input.value = index.toString();
                input.required = true;

                const text = document.createElement('span');
                text.textContent = choice;

                label.appendChild(input);
                label.appendChild(text);
                choicesEl.appendChild(label);
            });
            resultEl.textContent = '';
        };

        renderQuestion();

        quiz.addEventListener('submit', event => {
            event.preventDefault();
            const formData = new FormData(quiz);
            const selected = formData.get('quiz-choice');
            if (!selected) return;

            const currentIndex = Number(quiz.dataset.currentQuestionIndex || 0);
            const question = questions[currentIndex];

            if (Number(selected) === question.answer) {
                resultEl.textContent = `Correct! ${question.explanation}`;
                resultEl.style.color = '#16a34a';
            } else {
                resultEl.textContent = `Not quite. ${question.explanation}`;
                resultEl.style.color = '#dc2626';
            }

            setTimeout(renderQuestion, 3200);
        });
    }

    // Break-even calculator
    const breakevenForm = document.querySelector('[data-breakeven]');
    breakevenForm?.addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(breakevenForm);
        const fixed = Number(formData.get('fixed'));
        const price = Number(formData.get('price'));
        const variable = Number(formData.get('variable'));
        const resultEl = breakevenForm.querySelector('[data-breakeven-result]');

        if (price <= variable) {
            resultEl.textContent = 'Price must be greater than variable cost to reach break-even. Adjust your inputs and try again.';
            resultEl.style.color = '#dc2626';
            return;
        }

        const units = Math.ceil(fixed / (price - variable));
        resultEl.textContent = `You need to sell approximately ${units.toLocaleString()} units to break even.`;
        resultEl.style.color = '#0f172a';
    });

    // Current ratio analyzer
    const ratioForm = document.querySelector('[data-ratio]');
    ratioForm?.addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(ratioForm);
        const assets = Number(formData.get('assets'));
        const liabilities = Number(formData.get('liabilities'));
        const resultEl = ratioForm.querySelector('[data-ratio-result]');

        if (liabilities === 0) {
            resultEl.textContent = 'Liabilities cannot be zero for this ratio. Double-check the input values.';
            resultEl.style.color = '#dc2626';
            return;
        }

        const ratio = assets / liabilities;
        let assessment = '';
        if (ratio >= 2) {
            assessment = 'Strong liquidity: assets comfortably cover short-term obligations.';
        } else if (ratio >= 1) {
            assessment = 'Adequate liquidity: monitor cash flows to maintain a buffer.';
        } else {
            assessment = 'Caution: liquidity is tight. Consider ways to boost working capital.';
        }

        resultEl.textContent = `Current Ratio: ${ratio.toFixed(2)}. ${assessment}`;
        resultEl.style.color = '#0f172a';
    });

    // Dynamic year
    const yearSpan = document.querySelector('[data-year]');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear().toString();
    }
})();
