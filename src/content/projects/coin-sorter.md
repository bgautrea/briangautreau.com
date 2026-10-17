---
title: coin_sorter
blurb: A computer vision pipeline for an automated coin sorter. A Raspberry Pi 5 watches a belt, classifies each coin, and tells a Pico which bin to route it to.
status: active
repo: https://github.com/bgautrea/coin_sorter
stack: [Python, ONNX Runtime, OpenCV, PyTorch, YOLO, Raspberry Pi, Pico]
order: 40
---

A camera on a Raspberry Pi 5 watches a moving belt. Each frame goes through OpenCV into an ONNX classifier that calls the coin: penny, nickel, dime, quarter, or reject. A serial command then tells a Raspberry Pi Pico to throw the diverter for the right bin.

Training happens off the Pi, on a Colab GPU, from frames captured and labelled on the device. The Pi never installs PyTorch; it only runs ONNX Runtime for inference.
