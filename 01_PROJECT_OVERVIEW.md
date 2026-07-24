# Guest Check-in Assistant
# 01_PROJECT_OVERVIEW.md

Version: 1.0

Author: Sameer Kashyap

---

# Project Vision

Guest Check-in Assistant is an offline-first, AI-powered hotel and homestay guest registration application built specifically for the Indian hospitality industry.

The application's primary objective is to reduce guest check-in time from several minutes to only a few seconds by automatically recognizing government-issued identity documents, extracting guest information using OCR and intelligent parsing, validating the extracted information, and populating the check-in form automatically.

The application should feel as intelligent and seamless as Google Lens or Microsoft Lens while remaining completely optimized for hotel and homestay operations.

The application should require minimal interaction from reception staff.

Instead of asking users to manually enter guest details, the application should automatically understand the scanned document and build a complete guest profile.

---

# Primary Goals

The scanner must:

• Recognize Indian identity documents automatically

• Detect document type automatically

• Detect front/back side automatically

• Read information continuously using OCR

• Merge OCR information from multiple frames

• Merge front and back information

• Validate extracted information

• Auto-fill guest check-in form

• Reduce typing to almost zero

• Work completely offline

• Be extremely fast

• Never require users to manually choose document type

---

# Core Philosophy

This project is NOT a document scanner.

This project is NOT a camera application.

This project is an intelligent document understanding engine.

The goal is NOT to capture beautiful images.

The goal is to understand guest identity as quickly and accurately as possible.

If information is readable, scanning should stop immediately.

Image quality is secondary.

Correct information is primary.

---

# Target Users

• Hotels

• Homestays

• Guest Houses

• Resorts

• Lodges

• Hostels

• Rental Properties

• Airbnb Hosts

• Government Rest Houses

---

# Supported Platforms

Android

(Current Priority)

Future:

iOS

Tablet

Desktop Dashboard

Web Dashboard

---

# Technology Stack

Framework

React Native

Expo SDK 57

Language

TypeScript

Navigation

Expo Router

Database

SQLite

State Management

Zustand

Storage

MMKV

Secure Storage

Expo Secure Store

OCR

ML Kit Text Recognition

Camera

Expo Camera

Animations

Reanimated

UI

NativeWind

---

# Supported Documents

The scanner must automatically recognize all supported Indian government-issued identity documents.

No manual selection.

---

## Aadhaar Card

Supported Versions

✔ Old Aadhaar

✔ New PVC Aadhaar

✔ e-Aadhaar

✔ Bank KYC Aadhaar

✔ Printed Aadhaar

Languages

English

Hindi

Extract

Name

Gender

DOB

Year of Birth

Aadhaar Number

Address

PIN

State

Country

Photo

QR Code

---

## PAN Card

Supported Versions

✔ Old PAN

✔ New QR PAN

Extract

PAN Number

Full Name

Father's Name

Date of Birth

Photo

QR

---

## Driving Licence

Supported Versions

✔ Smart Card

✔ PVC

✔ Laminated

✔ State Variants

Extract

DL Number

Name

DOB

Address

Issue Date

Expiry Date

Validity

Vehicle Classes

Blood Group

Authority

Photo

QR

---

## Voter ID

Supported Versions

✔ Old EPIC

✔ New e-EPIC

✔ PVC

Extract

EPIC Number

Name

Father's Name

Gender

DOB

Age

Address

Photo

QR

---

## Passport

Supported Versions

✔ Old Passport

✔ New Passport

Extract

Passport Number

Surname

Given Name

DOB

Gender

Nationality

Place of Birth

Place of Issue

Issue Date

Expiry Date

MRZ

Photo

Signature

---

# Scanner Philosophy

The user should never select

"Aadhaar"

"PAN"

"Driving Licence"

"Passport"

or

"Voter ID"

The scanner should determine everything automatically.

---

# Intelligent Detection Flow

Camera Opens

↓

OCR Starts

↓

Document Detection

↓

Confidence Score

↓

Field Extraction

↓

Validation

↓

Merge Data

↓

Confirmation Screen

↓

Save Guest

---

# Automatic Front / Back Detection

The scanner should understand whether both sides are required.

Example

Aadhaar

Front scanned

↓

Address missing

↓

Ask user

Please flip the Aadhaar card

↓

Scan back

↓

Merge

↓

Done

---

PAN

Front scanned

↓

Everything available

↓

Skip back

↓

Done

---

Driving Licence

Front scanned

↓

Vehicle class missing

↓

Scan back

↓

Merge

↓

Done

---

Passport

Bio Page scanned

↓

Everything available

↓

Done

---

Voter ID

Front scanned

↓

Address missing

↓

Scan back

↓

Done

---

# Intelligent OCR

The scanner should NEVER rely on a single frame.

Instead

Read

Frame 1

↓

Frame 2

↓

Frame 3

↓

Frame 4

↓

Merge Best Results

↓

Generate Final Guest Profile

---

# Confidence Based Recognition

Every extracted field must include confidence.

Example

Name

99%

DOB

97%

Gender

100%

Address

91%

PIN

100%

ID Number

100%

Only validated fields should be accepted.

---

# Standard Guest Profile

Regardless of document type, the application should always produce the same object.

Example

{
    idType,
    idNumber,
    fullName,
    fatherName,
    gender,
    dob,
    address,
    city,
    district,
    state,
    country,
    pinCode,
    nationality,
    photo,
    qrData,
    confidence,
    rawOCR
}

The rest of the application should never care whether the source document was Aadhaar, Passport, PAN, Driving Licence or Voter ID.

---

# Primary User Flow

Receptionist

↓

Tap

New Check-in

↓

Camera Opens

↓

Scan Document

↓

Document Recognized

↓

Fields Extracted

↓

Confirmation Screen

↓

Edit (Optional)

↓

Save

↓

Room Selection

↓

Check-in Completed

---

# Performance Goals

Camera opens in under 1 second.

Recognition begins immediately.

Recognition should complete within 2–5 seconds under normal lighting.

UI must remain at 60 FPS.

No frozen interface.

No unnecessary loading screens.

---

# Offline First

Everything should work without internet.

OCR

Local

Parsing

Local

SQLite

Local

Validation

Local

Guest Database

Local

No cloud dependency.

---

# Security

Guest data must never leave the device unless explicitly synchronized.

Sensitive information should remain encrypted where appropriate.

No analytics should transmit guest identity.

No OCR text should be uploaded without user consent.

---

# Scalability

The architecture must allow adding new document types without changing the scanner core.

Future supported documents may include:

OCI Card

Visa

International Passport

Employee ID

Student ID

Military ID

Government ID

Hotel Membership Card

Company ID

The scanner should be plugin-based.

Adding a new document should only require implementing a new parser plugin.

---

# Development Principles

The codebase must follow:

Clean Architecture

Feature-first organization

Reusable components

Strong TypeScript typing

Minimal duplication

Performance-first design

Offline-first architecture

Modular parser plugins

Well-documented code

Comprehensive error handling

Easy testing

Easy future expansion

---

# Success Criteria

The project will be considered successful when a receptionist can:

Open the camera.

Hold any supported Indian government ID in front of the device.

The application automatically recognizes the document.

Automatically determines the document type.

Automatically detects the front/back side.

Extracts all available guest information.

Validates the extracted data.

Displays a confirmation screen.

Saves the guest profile.

Completes the entire identity capture process in under 10 seconds with minimal manual interaction.
