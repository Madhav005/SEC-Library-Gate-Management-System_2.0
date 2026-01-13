package com.library.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class Staff {
    @Id
    private String regNo;
    private String name;
    private String department;
}
