all: build

build:
	npm install
	tsc --target 'es5' connector.ts

clean:
	rm -rf ./node_modules/
	rm *.js

docker-build:
	docker build -t azure/aci-connector-k8s:latest .

