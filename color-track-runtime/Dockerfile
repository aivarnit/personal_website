FROM ros:noetic-ros-core-focal

ARG COLOR_TRACK_REF=main
ENV DEBIAN_FRONTEND=noninteractive \
    ROS_HOME=/tmp/ros \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      git \
      python3-flask \
      python3-numpy \
      python3-opencv \
      python3-websockets \
      ros-noetic-cv-bridge \
      ros-noetic-geometry-msgs \
      ros-noetic-nav-msgs \
      ros-noetic-rosbridge-server \
      ros-noetic-sensor-msgs \
      ros-noetic-tf \
      ros-noetic-std-msgs \
    && rm -rf /var/lib/apt/lists/* \
    && git clone https://github.com/aivarnit/color-track.git /opt/color-track \
    && git -C /opt/color-track checkout "$COLOR_TRACK_REF" \
    && git -C /opt/color-track rev-parse HEAD > /opt/color-track/UPSTREAM_REVISION \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin demo

WORKDIR /opt/demo
COPY --chown=demo:demo . /opt/demo
RUN chmod 0555 /opt/demo/run-color-track.py /opt/demo/runtime_api.py \
      /opt/demo/simulator.py /opt/demo/rosbridge_proxy.py \
      /opt/demo/verify_runtime.py

ENV HOME=/tmp
USER 10001:10001

ENTRYPOINT ["/ros_entrypoint.sh"]
CMD ["python3", "/opt/demo/runtime_api.py"]
