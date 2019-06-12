#!/bin/bash
set -e

project="indra_v2"
flag="${1:-dev}"

# If we're restarting the whole thing
if [[ "$flag" == "prod" || "$flag" == "dev" ]]
then
  bash ops/stop.sh
  bash ops/start-$flag.sh

# If we're just restarting the proxy
elif [[ "$flag" == "proxy" ]]
then
  docker service scale ${project}_$flag=0
  docker service scale ${project}_$flag=1

# If we're restarting one service of the stack we also need to restart the proxy
else
  docker service scale ${project}_$flag=0
  docker service scale ${project}_proxy=0
  docker service scale ${project}_proxy=1
  docker service scale ${project}_$flag=1
fi