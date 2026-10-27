package cn.aipersona;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("cn.aipersona.profile.persistence")
public class PersonaApplication {
    public static void main(String[] args) { SpringApplication.run(PersonaApplication.class, args); }
}
