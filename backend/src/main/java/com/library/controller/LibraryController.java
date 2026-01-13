package com.library.controller;

import com.library.entity.*;
import com.library.repository.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class LibraryController {

    private final StudentRepository studentRepo;
    private final StaffRepository staffRepo;
    private final LogEntryRepository logRepo;

    public LibraryController(StudentRepository s, StaffRepository st, LogEntryRepository l) {
        this.studentRepo = s;
        this.staffRepo = st;
        this.logRepo = l;
    }

    // -------- MASTER DATA --------

    @GetMapping("/students_data")
    public List<Student> students() {
        return studentRepo.findAll();
    }

    @GetMapping("/staff_data")
    public List<Staff> staff() {
        return staffRepo.findAll();
    }

    @PostMapping("/students_data")
    public Student addStudent(@RequestBody Student s) {
        return studentRepo.save(s);
    }

    @PostMapping("/staff_data")
    public Staff addStaff(@RequestBody Staff s) {
        return staffRepo.save(s);
    }

    @PostMapping("/students_data/{regNo}")
    public Student updateStudent(@PathVariable String regNo, @RequestBody Student s) {
        return studentRepo.save(s);
    }

    @PostMapping("/staff_data/{regNo}")
    public Staff updateStaff(@PathVariable String regNo, @RequestBody Staff s) {
        return staffRepo.save(s);
    }

    @GetMapping("/lookup/{regNo}")
    public Object lookup(@PathVariable String regNo) {
        return studentRepo.findById(regNo)
                .map(s -> Map.of("regNo", s.getRegNo(), "name", s.getName(), "department", s.getDepartment(), "userType", "STUDENT"))
                .orElse(
                    staffRepo.findById(regNo)
                        .map(s -> Map.of("regNo", s.getRegNo(), "name", s.getName(), "department", s.getDepartment(), "userType", "STAFF"))
                        .orElse(null)
                );
    }

    @PostMapping("/bulk-delete")
    public Map<String, Integer> bulkDelete(@RequestBody Map<String, List<String>> req) {
        List<String> regNos = req.get("regNos");
        regNos.forEach(r -> {
            studentRepo.deleteById(r);
            staffRepo.deleteById(r);
        });
        return Map.of("deletedCount", regNos.size());
    }

    @jakarta.transaction.Transactional
    @PostMapping("/register-unknown")
    public Object registerUnknown(@RequestBody Map<String, String> req) {
        String regNo = req.get("regNo");
        String name = req.get("name");
        String dept = req.get("department");
        String type = req.get("userType");

        // 1. Save to Master
        if ("STUDENT".equalsIgnoreCase(type)) {
            Student s = new Student();
            s.setRegNo(regNo);
            s.setName(name);
            s.setDepartment(dept);
            studentRepo.save(s);
        } else {
            Staff s = new Staff();
            s.setRegNo(regNo);
            s.setName(name);
            s.setDepartment(dept);
            staffRepo.save(s);
        }

    // 2. Update Logs
        logRepo.updateUnknownEntries(regNo, name, dept, type.toUpperCase());

        return Map.of("success", true, "message", "User Registered and Logs Updated");
    }

    @jakarta.transaction.Transactional
    @PostMapping("/sync-unknown")
    public Map<String, Integer> syncUnknownLogs() {
        List<LogEntry> unknowns = logRepo.findByNameIsNull();
        System.out.println("SYNC: Found " + unknowns.size() + " unknown entries.");
        
        Set<String> regNos = new HashSet<>();
        for (LogEntry l : unknowns) regNos.add(l.getRegNo());

        int count = 0;
        for (String regNo : regNos) {
            Optional<Student> s = studentRepo.findById(regNo);
            if (s.isPresent()) {
                System.out.println("SYNC: Resolving " + regNo + " as STUDENT");
                logRepo.updateUnknownEntries(regNo, s.get().getName(), s.get().getDepartment(), "STUDENT");
                count++;
            } else {
                Optional<Staff> st = staffRepo.findById(regNo);
                if (st.isPresent()) {
                    System.out.println("SYNC: Resolving " + regNo + " as STAFF");
                    logRepo.updateUnknownEntries(regNo, st.get().getName(), st.get().getDepartment(), "STAFF");
                    count++;
                }
            }
        }
        return Map.of("resolvedCount", count);
    }

    // -------- LOG ENTRIES --------

    @GetMapping("/log_entry")
    public List<LogEntry> logs() {
        return logRepo.findAll();
    }

   @PostMapping("/log_entry")
   public LogEntry addOrToggleEntry(@RequestBody LogEntry req) {

    Optional<LogEntry> active =
            logRepo.findTopByRegNoAndCheckOutTimeIsNull(req.getRegNo());

    // 🔁 CHECK-OUT
    if (active.isPresent()) {
        LogEntry e = active.get();
        e.setCheckOutTime(LocalDateTime.now());
        return logRepo.save(e);
    }

    // ➕ CHECK-IN
    req.setId(null); // ensure new UUID
    req.setCheckInTime(LocalDateTime.now());
    return logRepo.save(req);
   }

    @PutMapping("/log_entry/{id}/checkout")
    public LogEntry checkout(@PathVariable String id) {
        LogEntry e = logRepo.findById(id).orElseThrow();
        e.setCheckOutTime(LocalDateTime.now());
        return logRepo.save(e);
    }

    @PutMapping("/log_entry/checkout-all")
    public void checkoutAll() {
        logRepo.findByCheckOutTimeIsNull()
               .forEach(e -> {
                   e.setCheckOutTime(LocalDateTime.now());
                   logRepo.save(e);
               });
    }

    @GetMapping("/ping")
public String ping() {
    return "API WORKING";
}

}
