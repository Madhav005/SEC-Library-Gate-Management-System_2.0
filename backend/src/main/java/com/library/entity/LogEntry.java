package com.library.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
public class LogEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String regNo;
    private String name;
    private String department;
    private String userType;

    private LocalDateTime checkInTime = LocalDateTime.now();
    private LocalDateTime checkOutTime;
}
