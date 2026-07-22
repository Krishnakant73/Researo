# Attention Is All You Need

**Authors:** Vaswani, Shazeer, Parmar, Uszkoreit et al.
**Category:** Technology

## Abstract

We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. The model achieves superior quality while being more parallelizable and requiring less time to train.

## Model Architecture

Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. It replaces recurrent connections while permitting parallelisation across the sequence dimension. Positional encodings inject order information without recurrence.

## Results

On the WMT 2014 English-to-German translation task, our big transformer model achieves 28.4 BLEU, improving over the existing best results by over 2 BLEU. Training required significantly less compute than prior state-of-the-art recurrent and convolutional models.

## Impact

The Transformer became the foundation for subsequent large language models. Its scalability properties enabled the training of models with billions of parameters on massive text corpora.
