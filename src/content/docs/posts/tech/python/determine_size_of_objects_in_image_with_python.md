---
tags: ['python', 'chatgpt', 'edgegpt', 'opencv']
title: Measuring how much of an image each detected object covers with YOLOv3 and OpenCV
description: Detect objects in an image with YOLOv3 and OpenCV's DNN module, then report each bounding box's area as a fraction of the whole image.
pubDate: Fri, 14 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/other/output-1.webp
---

:::caution
OpenCV 5.0 removed the Darknet importer, so `readNetFromDarknet()` and loading `.cfg`/`.weights` files no longer work. This example needs OpenCV 4.x (`pip install "opencv-python<5"`). To use OpenCV 5, convert the model to ONNX first and load it with `cv2.dnn.readNetFromONNX()`; see the [OpenCV 4 to 5 migration guide](https://github.com/opencv/opencv/wiki/OpenCV-4-to-5-migration).
:::

This script runs the YOLOv3 object detector on an image and, for each detected object, prints what fraction of the image its bounding box covers. That is a *relative* size in pixels. It tells you that the car takes up 12% of the photo, not that the car is 4 metres long.

## Setup

```bash
pip install "opencv-python<5" numpy
```

Download three files into the same folder as the script:

- `yolov3.cfg` from the Darknet repo: https://github.com/pjreddie/darknet/blob/master/cfg/yolov3.cfg
- `coco.names` (the 80 class labels) from the same repo: https://github.com/pjreddie/darknet/blob/master/data/coco.names
- `yolov3.weights` (about 237 MB), linked from https://pjreddie.com/darknet/yolo/

## The script

```python
import cv2
import numpy as np

CONF_THRESHOLD = 0.5  # minimum class score to keep a detection
NMS_THRESHOLD = 0.4   # overlap above which duplicate boxes are suppressed

net = cv2.dnn.readNetFromDarknet("yolov3.cfg", "yolov3.weights")

with open("coco.names") as f:
    classes = [line.strip() for line in f]

image = cv2.imread("input.jpg")
if image is None:
    raise FileNotFoundError("could not read input.jpg")
height, width = image.shape[:2]

# YOLOv3 expects a 416x416 RGB image with pixel values scaled to 0..1
blob = cv2.dnn.blobFromImage(image, 1 / 255.0, (416, 416), swapRB=True, crop=False)
net.setInput(blob)
outs = net.forward(net.getUnconnectedOutLayersNames())

boxes, confidences, class_ids = [], [], []
for out in outs:
    for detection in out:
        # detection = [center_x, center_y, w, h, objectness, 80 class scores...]
        scores = detection[5:]
        class_id = int(np.argmax(scores))
        confidence = float(scores[class_id])
        if confidence > CONF_THRESHOLD:
            cx, cy, w, h = detection[:4] * np.array([width, height, width, height])
            boxes.append([int(cx - w / 2), int(cy - h / 2), int(w), int(h)])
            confidences.append(confidence)
            class_ids.append(class_id)

# YOLO predicts several overlapping boxes per object; keep the best one
keep = cv2.dnn.NMSBoxes(boxes, confidences, CONF_THRESHOLD, NMS_THRESHOLD)

for i in np.array(keep).flatten():
    x, y, w, h = boxes[i]
    # Clip the box to the image so objects at the edge aren't over-counted
    x0, y0 = max(x, 0), max(y, 0)
    x1, y1 = min(x + w, width), min(y + h, height)
    relative_size = (x1 - x0) * (y1 - y0) / (width * height)

    label = f"{classes[class_ids[i]]} {relative_size:.1%}"
    print(f"{label} (confidence {confidences[i]:.2f})")
    cv2.rectangle(image, (x0, y0), (x1, y1), (0, 255, 0), 2)
    cv2.putText(image, label, (x0, max(y0 - 5, 15)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

cv2.imwrite("output.jpg", image)
```

## How it works

1. `blobFromImage` resizes the image to 416×416, scales pixels to 0–1, and swaps BGR (OpenCV's channel order) to RGB.
2. `net.forward(net.getUnconnectedOutLayersNames())` runs the network and returns the outputs of YOLOv3's three detection layers, one per scale.
3. Each detection row holds a box centre, width and height as fractions of the image, an objectness score, and one score per class. The script keeps rows where the best class score is above 0.5 and converts the box to pixel coordinates.
4. `cv2.dnn.NMSBoxes` applies non-maximum suppression. Without it you get several near-identical boxes, and printed sizes, for every object.
5. The relative size is the clipped box area divided by the image area.

The annotated image is saved to `output.jpg`. To show it in a window instead, replace the last line with `cv2.imshow("Output", image)`, `cv2.waitKey(0)` and `cv2.destroyAllWindows()`.

## Limitations

- **Box area isn't object area.** A bounding box around a diagonal pole or a person with outstretched arms is mostly background. If you need the pixels that actually belong to the object, use an instance segmentation model instead of a detector.
- **No real-world units.** Converting pixels to centimetres needs a reference object of known size in the same plane, or camera calibration.
- **Only the 80 COCO classes.** YOLOv3 trained on COCO can only find objects in `coco.names`. Anything else needs a model trained on your classes.
- **YOLOv3 is from 2018.** It still works for experiments, but newer detectors are more accurate and are usually distributed as ONNX or PyTorch models rather than Darknet weights.
