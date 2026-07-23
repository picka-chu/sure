from setuptools import setup, find_packages

setup(
    name="surepay",
    version="1.0.0",
    description="Python SDK for Surepay — verify Ethiopian bank transfer receipts",
    long_description=open("README.md").read() if __import__("os").path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    author="Surepay",
    url="https://surepay.et",
    packages=find_packages(),
    install_requires=["httpx>=0.27.0"],
    python_requires=">=3.10",
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)
