package com.library.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.library.entity.Staff; 

public interface StaffRepository extends JpaRepository<Staff, String> {}
