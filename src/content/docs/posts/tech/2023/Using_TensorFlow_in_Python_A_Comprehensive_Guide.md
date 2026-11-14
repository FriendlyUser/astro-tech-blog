---
description: "Train an MNIST digit classifier with TensorFlow and Keras in Python: load data with tf.data, build, train and evaluate a model, save it, and serve it."
imgSrc: /imgs/2023/4181036141.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-03-02T08:14:57.000Z'
lastUpdated: 2026-11-14
tags: ['python']
title: "TensorFlow in Python: train, save and serve an MNIST classifier with Keras"
---

TensorFlow is Google's open-source machine learning library. Its high-level API is Keras, which you use to define, train and save models; TensorFlow underneath handles the tensors, gradients and hardware. This post walks through one complete example: classify MNIST handwritten digits, from loading the data to serving predictions over HTTP.

The code was checked against TensorFlow 2.21 and TensorFlow Datasets 4.9.10. Since TensorFlow 2.16, `tf.keras` is Keras 3, which changed how models are saved; older tutorials that call `model.save("some_dir")` no longer work as written.

## Installation

Use a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate   # on Windows: .venv\Scripts\activate
pip install tensorflow tensorflow-datasets
```

If `tfds.load()` later fails with `ModuleNotFoundError: No module named 'importlib_resources'`, run `pip install importlib_resources`; with TensorFlow Datasets 4.9.10 that dependency wasn't always installed automatically.

For NVIDIA GPU support on Linux (or Windows via WSL2), install `tensorflow[and-cuda]` instead, which pulls in the CUDA and cuDNN libraries as pip packages:

```bash
pip install "tensorflow[and-cuda]"
```

The old `tensorflow-gpu` package has been removed, and native Windows has had no GPU support since TensorFlow 2.10. Check the [install guide](https://www.tensorflow.org/install/pip) for supported Python versions.

## Loading and preparing the data

TensorFlow Datasets downloads MNIST and returns it as `tf.data.Dataset` objects:

```python
import tensorflow as tf
import tensorflow_datasets as tfds

(ds_train, ds_test), ds_info = tfds.load(
    "mnist",
    split=["train", "test"],
    shuffle_files=True,
    as_supervised=True,  # yield (image, label) tuples
    with_info=True,
)

def normalize_img(image, label):
    return tf.cast(image, tf.float32) / 255.0, label

ds_train = (
    ds_train.map(normalize_img, num_parallel_calls=tf.data.AUTOTUNE)
    .cache()
    .shuffle(ds_info.splits["train"].num_examples)
    .batch(128)
    .prefetch(tf.data.AUTOTUNE)
)

ds_test = (
    ds_test.map(normalize_img, num_parallel_calls=tf.data.AUTOTUNE)
    .batch(128)
    .cache()
    .prefetch(tf.data.AUTOTUNE)
)
```

Each image is a `28x28x1` uint8 tensor; `normalize_img` scales pixels to `0..1`. `cache()` keeps the decoded dataset in memory after the first epoch (MNIST is small enough), `shuffle()` reorders the training examples every epoch, and `prefetch()` prepares the next batch while the current one trains.

## Building the model

```python
model = tf.keras.Sequential([
    tf.keras.Input(shape=(28, 28, 1)),
    tf.keras.layers.Flatten(),
    tf.keras.layers.Dense(128, activation="relu"),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(10, activation="softmax"),
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(0.001),
    loss=tf.keras.losses.SparseCategoricalCrossentropy(),
    metrics=[tf.keras.metrics.SparseCategoricalAccuracy()],
)
```

This is a small fully connected network: flatten the image to 784 values, one hidden layer of 128 units, dropout for regularisation, and a 10-way softmax output (one probability per digit). `SparseCategoricalCrossentropy` is the right loss when labels are integers (`3`) rather than one-hot vectors.

## Training

```python
history = model.fit(ds_train, epochs=10, validation_data=ds_test)
```

`history.history` holds per-epoch loss and accuracy for both the training and validation data, which you can plot to spot overfitting. Strictly, you should validate on a separate split rather than the test set and keep the test set for the final evaluation; MNIST tutorials commonly skip this.

## Evaluating

```python
test_loss, test_accuracy = model.evaluate(ds_test)
print(f"Test loss: {test_loss:.4f}")
print(f"Test accuracy: {test_accuracy:.4f}")
```

A model this simple typically reaches around 97–98% test accuracy on MNIST. A small convolutional network does better if you need it.

## Saving and loading

Keras 3 has two separate outputs, for two different purposes.

To save the model so you can load it back into Python and continue training or predicting, use the `.keras` format:

```python
model.save("mnist_model.keras")
loaded_model = tf.keras.models.load_model("mnist_model.keras")
```

To produce a TensorFlow SavedModel for serving (TensorFlow Serving, TFLite conversion), use `export()`:

```python
model.export("mnist_saved_model/1")
```

The trailing `/1` is a version number. TensorFlow Serving expects each model directory to contain numbered version subdirectories and serves the highest one.

Calling `model.save()` with a path that doesn't end in `.keras` (or the legacy `.h5`) raises an error in Keras 3, and `tf.keras.models.load_model()` can't load an exported SavedModel. To use one in Python, load it with `tf.saved_model.load()` or wrap it in `keras.layers.TFSMLayer`.

## Serving the model

[TensorFlow Serving](https://www.tensorflow.org/tfx/serving/docker) runs SavedModels behind a REST and gRPC API. The simplest way to run it is the official Docker image:

```bash
docker run -p 8501:8501 \
  --mount type=bind,source="$(pwd)/mnist_saved_model",target=/models/mnist \
  -e MODEL_NAME=mnist -t tensorflow/serving
```

Port 8501 is the REST API (gRPC is 8500). Then send it a test image:

```python
import numpy as np
import requests

# Take one batch from the test set and use its first image.
images, labels = next(ds_test.as_numpy_iterator())
sample_image = images[:1]  # shape (1, 28, 28, 1)

response = requests.post(
    "http://localhost:8501/v1/models/mnist:predict",
    json={"instances": sample_image.tolist()},
    timeout=10,
)
response.raise_for_status()
predictions = response.json()["predictions"]

print("Predicted label:", int(np.argmax(predictions[0])))
print("Actual label:", int(labels[0]))
```

`ds_test` is batched, so each element is a batch of 128 images; slicing with `[:1]` keeps the batch dimension the model expects. The request body's `instances` is a list of inputs, and the response's `predictions` holds one list of 10 probabilities per input.

## Gotchas

- `tf.data.experimental.AUTOTUNE` in older code is now just `tf.data.AUTOTUNE`.
- Passing `input_shape=` to the first layer still works but Keras 3 warns about it; use a `tf.keras.Input` layer instead, as above.
- Keras 3 can also run on JAX or PyTorch backends. Everything here uses the TensorFlow backend, which is the default when you install `tensorflow`.
- If you only need inference on mobile or embedded devices, look at LiteRT (formerly TensorFlow Lite) rather than TensorFlow Serving.

## Further reading

- [TensorFlow tutorials](https://www.tensorflow.org/tutorials)
- [Training a neural network on MNIST with Keras (TFDS)](https://www.tensorflow.org/datasets/keras_example)
- [Keras: save, serialize and export models](https://keras.io/guides/serialization_and_saving/)
- [TensorFlow Serving with Docker](https://www.tensorflow.org/tfx/serving/docker)
