# Backend Spring Boot (Java 21). Build: docker build -t vtph-backend .
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 vtph
COPY --from=build /app/target/vtph-coffee-*.jar app.jar
USER vtph
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
