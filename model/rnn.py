"""Tiny character-level vanilla RNN implemented with NumPy.

This is an educational model initialized with random weights. It is not based
on a pretrained model and is intentionally much smaller than a modern LLM.
"""
from pathlib import Path
import numpy as np


class CharRNN:
    def __init__(self, vocab_size: int, hidden_size: int = 96, seed: int = 42):
        self.vocab_size = vocab_size
        self.hidden_size = hidden_size
        rng = np.random.default_rng(seed)
        self.Wxh = rng.normal(0, 0.01, (hidden_size, vocab_size))
        self.Whh = rng.normal(0, 0.01, (hidden_size, hidden_size))
        self.Why = rng.normal(0, 0.01, (vocab_size, hidden_size))
        self.bh = np.zeros((hidden_size, 1))
        self.by = np.zeros((vocab_size, 1))

    @staticmethod
    def softmax(x):
        x = x - np.max(x)
        ex = np.exp(x)
        return ex / np.sum(ex)

    def train_chunk(self, inputs, targets, hprev, learning_rate=0.08):
        xs, hs, ps = {}, {-1: hprev}, {}
        loss = 0.0
        for t, (ix, target) in enumerate(zip(inputs, targets)):
            xs[t] = np.zeros((self.vocab_size, 1))
            xs[t][ix] = 1
            hs[t] = np.tanh(self.Wxh @ xs[t] + self.Whh @ hs[t - 1] + self.bh)
            y = self.Why @ hs[t] + self.by
            ps[t] = self.softmax(y)
            loss += -np.log(ps[t][target, 0] + 1e-12)

        dWxh = np.zeros_like(self.Wxh)
        dWhh = np.zeros_like(self.Whh)
        dWhy = np.zeros_like(self.Why)
        dbh = np.zeros_like(self.bh)
        dby = np.zeros_like(self.by)
        dhnext = np.zeros_like(hprev)

        for t in reversed(range(len(inputs))):
            dy = ps[t].copy()
            dy[targets[t]] -= 1
            dWhy += dy @ hs[t].T
            dby += dy
            dh = self.Why.T @ dy + dhnext
            dhraw = (1 - hs[t] * hs[t]) * dh
            dbh += dhraw
            dWxh += dhraw @ xs[t].T
            dWhh += dhraw @ hs[t - 1].T
            dhnext = self.Whh.T @ dhraw

        for grad in (dWxh, dWhh, dWhy, dbh, dby):
            np.clip(grad, -5, 5, out=grad)
        for name, grad in (("Wxh", dWxh), ("Whh", dWhh), ("Why", dWhy), ("bh", dbh), ("by", dby)):
            setattr(self, name, getattr(self, name) - learning_rate * grad)
        return loss / max(1, len(inputs)), hs[len(inputs) - 1]

    def generate(self, seed_index, length=300, temperature=0.8):
        h = np.zeros((self.hidden_size, 1))
        x = np.zeros((self.vocab_size, 1))
        x[seed_index] = 1
        output = []
        temperature = max(0.15, float(temperature))
        for _ in range(max(1, min(int(length), 1200))):
            h = np.tanh(self.Wxh @ x + self.Whh @ h + self.bh)
            logits = (self.Why @ h + self.by).ravel() / temperature
            p = self.softmax(logits)
            idx = int(np.random.choice(self.vocab_size, p=p))
            x = np.zeros((self.vocab_size, 1))
            x[idx] = 1
            output.append(idx)
        return output

    def save(self, path, chars):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(path, Wxh=self.Wxh, Whh=self.Whh, Why=self.Why,
                            bh=self.bh, by=self.by, chars=np.array(chars))

    @classmethod
    def load(cls, path):
        data = np.load(path, allow_pickle=False)
        chars = data["chars"].tolist()
        model = cls(len(chars), hidden_size=data["Whh"].shape[0])
        for name in ("Wxh", "Whh", "Why", "bh", "by"):
            setattr(model, name, data[name])
        return model, chars
