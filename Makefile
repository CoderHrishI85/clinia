install:
	pip install -r Backend/requirements.txt

run:
	python -m uvicorn Backend.app.main:app --reload

test:
	python -m pytest Backend/tests/ -v
	