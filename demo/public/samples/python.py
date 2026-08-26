def greet(name: str) -> str:
    # comment
    if not name:
        return "hi"
    return f"Hello, {name}!"

for i in range(3):
    print(greet(f"user {i}"))
