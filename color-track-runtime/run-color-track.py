#!/usr/bin/env python3
"""Headless entry point for the repository's original CTrack.py algorithm."""

import os
import sys

import cv2
import rospy


SOURCE = "/opt/color-track"
sys.path.insert(0, SOURCE)

# CTrack.py opens two OpenCV GUI windows. A server container has no display;
# the same camera frames are streamed to the browser instead. Keep all image
# conversion, thresholding, moments, steering and stop logic in upstream code.
cv2.namedWindow = lambda *args, **kwargs: None
cv2.imshow = lambda *args, **kwargs: None
cv2.waitKey = lambda *args, **kwargs: -1

import CTrack  # noqa: E402  (upstream module needs the headless hooks above)


if __name__ == "__main__":
    rospy.loginfo("Executing upstream CTrack.py from %s", os.path.realpath(CTrack.__file__))
    try:
        CTrack.CTrack("orange")
    except rospy.ROSInterruptException:
        pass
