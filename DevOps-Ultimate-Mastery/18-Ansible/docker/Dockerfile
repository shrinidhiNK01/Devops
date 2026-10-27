FROM ubuntu:22.04
RUN apt-get update && apt-get install -y ansible
COPY src/ /ansible
WORKDIR /ansible
CMD ["ansible-playbook", "main.yml"]
