package com.library.repository;

import com.library.entity.LogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

import java.util.List;

public interface LogEntryRepository extends JpaRepository<LogEntry, String> {

    List<LogEntry> findByCheckOutTimeIsNull();

    Optional<LogEntry> findTopByRegNoAndCheckOutTimeIsNull(String regNo);

    // Find custom query to update unknown entries
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE LogEntry l SET l.name = :name, l.department = :department, l.userType = :userType WHERE l.regNo = :regNo AND l.name IS NULL")
    void updateUnknownEntries(String regNo, String name, String department, String userType);

    List<LogEntry> findByNameIsNull();
}
