"""Train the tiny character model from random initialization."""
import argparse
from pathlib import Path
import numpy as np
from model.rnn import CharRNN

CORPUS = Path("data/corpus.txt")
OUTPUT = Path("model/weights.npz")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=900)
    parser.add_argument("--hidden", type=int, default=96)
    args = parser.parse_args()

    text = CORPUS.read_text(encoding="utf-8")
    chars = sorted(set(text))
    if len(text) < 100 or len(chars) < 10:
        raise RuntimeError("The training corpus is too small.")
    char_to_ix = {ch: i for i, ch in enumerate(chars)}
    data = [char_to_ix[ch] for ch in text]
    model = CharRNN(len(chars), hidden_size=args.hidden)
    pointer = 0
    h = np.zeros((args.hidden, 1))

    for step in range(max(1, args.steps)):
        if pointer + 61 >= len(data):
            pointer = 0
            h = np.zeros((args.hidden, 1))
        inputs = data[pointer:pointer + 60]
        targets = data[pointer + 1:pointer + 61]
        loss, h = model.train_chunk(inputs, targets, h)
        pointer += 60
        if (step + 1) % 100 == 0:
            print(f"step {step + 1}/{args.steps} - loss: {loss:.3f}", flush=True)

    model.save(OUTPUT, chars)
    print(f"Saved randomly initialized and trained model to {OUTPUT}", flush=True)


if __name__ == "__main__":
    main()
