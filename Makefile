all: build

build:
	npm install
	tsc --target 'es5' bridge.ts

clean:
	rm -rf ./node_modules/
	rm *.js

docker-build:
	docker build -t azure/aci-bridge-k8s:latest .

