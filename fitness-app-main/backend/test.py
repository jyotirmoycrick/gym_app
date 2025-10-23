import bcrypt

password = b"Jforcrickmalo@19"
hashed = bcrypt.hashpw(password, bcrypt.gensalt())

print("New Hash:", hashed)
