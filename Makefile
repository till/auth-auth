.PHONY: docker-build docker-run

IMAGE:=auth-auth

docker-build:
	docker build -t $(IMAGE) . 

docker-run:
	docker run -p 3000:3000 --rm $(IMAGE)
