# open medium_articles and change file path endings to unix

created_articles = []
with open ("scripts/medium_articles.txt", "r") as f:
    for line in f.readlines():
        created_articles.append(line.strip().replace("\\", "/"))

  
# resave
with open ("scripts/medium_articles.txt", "w") as f:
    for article in created_articles:
        f.write(article + "\n")