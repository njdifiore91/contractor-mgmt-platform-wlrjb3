```
# Product Requirements Document (PRD)

## 1. Overview

### 1.1 Purpose

This document outlines the requirements for a custom-built web application to track data, communication, and notes related to individuals who provide services for the Client. The application will be developed with a structured approach to user management, permissions, customer relationships, equipment tracking, and administrative functionalities.

### 1.2 Scope

The application will facilitate the management of users, customers, contracts, inspectors, and equipment within the Client's ecosystem. The system will be built using VueJS for the frontend and Microsoft ASP.NET Core for backend management.

### 1.3 Data Field Definitions

To ensure consistency and clarity in the implementation, **List Fields** and **Dialog Fields** are defined as follows:

- **List Fields**: These fields must be used to display summarized data in tables or list views when multiple records are presented. The system should ensure these fields provide quick access to essential data points while maintaining a clean and structured layout.
- **Dialog Fields**: These fields must be used in interactive pop-up dialogs or dedicated forms when creating or editing records. The system should enforce structured data input, validation rules, and an intuitive user experience to facilitate seamless data management.

All fields should be implemented according to these guidelines to maintain uniformity across the application.

---

## 2. User Stories and Data Fields

### 2.1 Admin

- **Ability to Edit Quick Links**
    - Requires permission (Edit Links)
    - Links should open in a new tab and be displayed based on user configuration
    - **Fields:**
        - **List Fields:** Label, Link
        - **Dialog Fields:** Label, Link, Order
- **Ability to Add/Edit Code Types and Codes**
    - Requires permission (Edit Codes)
    - List contains code types and their respective codes
    - **Fields:**
        - **List Fields:** Code Type
        - **Dialog Fields:** Type Name, Codes (List with Edit/Add in Dialog), Code, Description, Expire-able
- **Ability to Add/Edit Users**
    - Requires permission (Edit Users)
    - **Fields:**
        - **List Fields:** First, Last, Email, Confirmed
        - **Dialog Fields:** First, Last, Email, Roles, Emails

---

### 2.2 Customers

- **Ability to Add/Edit a Customer**
    - **Fields:**
        - **List Fields:** Name, Code, Contacts, Contracts
        - **Dialog Fields:** Name, Code, Contacts, Contracts
- **Ability to Add/Edit Contracts to an Existing Customer**
    - **Fields:**
        - **List Fields:** Contract Name, Created, Created By, Active
        - **Dialog Fields:** Name, Active
- **Ability to Search for a Customer**
    - Search via name and code, results displayed in a table
    - **Fields:**
        - **List Fields:** Code, Company Name, Actions (Edit)
        - **Dialog Fields:** Search Box
- **Ability to Add/Edit Contacts to an Existing Customer**
    - **Fields:**
        - **List Fields:** First, Last, Date Created, Job Title, Actions (Edit/Delete)
        - **Dialog Fields:** First, Middle, Last, Suffix, Nickname, Deceased, Inactive, Rating, Job Title, Birthday
        - **Additional Related Data:**
            - **Addresses:** Address Type, Line 1, Line 2, Line 3, City, State, Zip, Country
            - **Emails:** Primary, Email
            - **Notes:** Date Created, Note, User
            - **Phone:** Primary, Type, Phone Number, Extension

---

### 2.3 Equipment

- **Ability to List Equipment by Company**
    - Requires permission (Edit Equipment)
    - **Fields:**
        - **List Fields:** Model, Serial Number, Description, Out, Condition
        - **Dialog Fields:** Model, Serial Number, Description, Condition
- **Ability to Assign Equipment to Inspectors**
    - **Fields:**
        - **List Fields:** Model, Serial Number, Description, Out, Condition, Returned, Returned On, Returned Condition
        - **Dialog Fields:** Equipment, Out Condition, Out Date
- **Ability to Track Receiving Equipment Back from an Inspector**
    - **Fields:**
        - **Dialog Fields:** Equipment, In Condition, In Date

---

### 2.4 Inspectors

- **Ability to View/Create/Edit Drug Tests Related to an Inspector**
    - Requires permission (Edit Users)
    - **Fields:**
        - **List Fields:** Created, User, Modified, Test Date, Test Type, Frequency, Result, Comment, Company
        - **Dialog Fields:** Test Date, Test Type, Frequency, Result, Comment
- **Ability to Search for an Inspector via Zip Code and Radius**
    - Uses SQL dataset for geographical search
    - **Fields:**
        - **List Fields:** Status, First, Last, State, Customers, Companies, Title, Specialties, Issues, Approval Needed, Email, Inspector ID, DOB, Nickname
- **Ability to Mobilize an Inspector**
    - Generates an email alert upon mobilization
    - **Fields:**
        - **Dialog Fields:** Employee Name, Primary Email, Phone, Date of Birth, Mob Date, Hire Type, Hire Pack, Training, ISP Trans, Drug Kit, D/A Pool, Project, Customer, Contract, Department, Function, Type, Location, Classification, Cert Required, Certs Required, Address Type, Ship Opt, Project Contact, Invoice Contact
- **Ability to Demobilize an Inspector**
    - Capture demobilization reason and date
    - **Fields:**
        - **Dialog Fields:** Demob Reason, Demob Date, Note
- **Ability to Open Inspector Files in OneDrive**
    - Auto-generates folder for each inspector
- **Ability to Class Change an Inspector**
    - Creates a new mobilization record for class change

---

### 2.5 General Development

- **Permissions**
    - Restricts user access to specific data and pages
- **Email Dialog**
    - Sends templated emails with attachments and user modifications
    - **Fields:**
        - **Dialog Fields:** To, Subject, Attachments, Body
- **List Framework**
    - Uses virtual scrolling instead of pagination
- **Navigation**
    - Built on user permissions with mobile optimization
- **Database Reorganization**
    - Enhances data structuring for optimized queries

---

### 3. Required Pages

Based on the defined user stories, the following pages must be implemented to support the application's functionality:

### 3.1 Admin Pages

- **Quick Links Management Page**: Allows administrators to edit quick links.
- **Code Types and Codes Management Page**: Enables adding and editing code types and associated codes.
- **User Management Page**: Supports adding, editing, and managing user roles and permissions.

### 3.2 Customer Pages

- **Customer List Page**: Displays a searchable list of customers.
- **Customer Detail Page**: Provides detailed customer information and allows editing.
- **Contract Management Page**: Manages contracts related to specific customers.
- **Contacts Management Page**: Allows adding and editing contacts for each customer.

### 3.3 Equipment Pages

- **Equipment List Page**: Displays all equipment associated with companies.
- **Equipment Assignment Page**: Supports assigning equipment to inspectors.
- **Equipment Return Tracking Page**: Logs and tracks equipment returns from inspectors.

### 3.4 Inspector Pages

- **Inspector List Page**: Provides search and filter functionalities for inspectors.
- **Inspector Detail Page**: Displays an inspector’s details and allows edits.
- **Inspector Drug Test Management Page**: Tracks drug test results for inspectors.
- **Inspector Mobilization Page**: Facilitates mobilizing inspectors for projects.
- **Inspector Demobilization Page**: Handles inspector demobilization tracking.
- **Inspector OneDrive Files Page**: Manages file storage for inspectors.
- **Inspector Class Change Page**: Enables class change actions for inspectors.

### 3.5 General Pages

- **Permissions Management Page**: Controls access rights for different user roles.
- **Email Dialog Page**: Supports sending templated and customized emails.
- **List Management Page**: Implements virtual scrolling for large lists.
- **Navigation Configuration Page**: Configures navigation menus based on user roles.

These pages must be implemented to fully support the user stories defined in this document.

---

## 4. Technology Stack

- **Frontend:** VueJS, Quasar Framework
- **Backend:** Microsoft ASP.NET Core
- **Database:** SQL Server
- **Cloud Hosting:** Microsoft Azure

---

## 6. Out-of-Scope

- Deployment and hosting costs
- Non-functional requirements such as high-availability and disaster recovery planning
- Ongoing maintenance beyond initial development

---
```