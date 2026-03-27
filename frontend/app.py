import streamlit as st
import requests

API_URL = "http://127.0.0.1:8000"

st.set_page_config(page_title="Clinia", page_icon="🏥", layout="wide")

def login(email, password):
    response = requests.post(f"{API_URL}/auth/login", json={"email": email, "password": password})
    return response

def get_patients(token):
    headers = {"Authorization": f"Bearer {token}"}
    return requests.get(f"{API_URL}/patients/", headers=headers).json()

def add_patient(token, name, phone, email):
    headers = {"Authorization": f"Bearer {token}"}
    return requests.post(f"{API_URL}/patients/", headers=headers, json={"name": name, "phone": phone, "email": email})

def get_appointments(token):
    headers = {"Authorization": f"Bearer {token}"}
    return requests.get(f"{API_URL}/appointments/", headers=headers).json()

def add_appointment(token, patient_id, doctor_name, appointment_date, reason):
    headers = {"Authorization": f"Bearer {token}"}
    return requests.post(f"{API_URL}/appointments/", headers=headers, json={
        "patient_id": patient_id,
        "doctor_name": doctor_name,
        "appointment_date": appointment_date.isoformat(),
        "reason": reason
    })

def main():
    st.title("🏥 Clinia — AI CRM for Clinics")

    if "token" not in st.session_state:
        st.session_state.token = None

    if st.session_state.token is None:
        st.subheader("Login")
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        if st.button("Login"):
            response = login(email, password)
            if response.status_code == 200:
                st.session_state.token = response.json()["access_token"]
                st.rerun()
            else:
                st.error("Invalid email or password!")
    else:
        tab1, tab2 = st.tabs(["👥 Patients", "📅 Appointments"])

     with tab1:
    st.subheader("All Patients")
    patients = get_patients(st.session_state.token)
    if patients:
        for p in patients:
            col1, col2, col3 = st.columns([4, 1, 1])
            with col1:
                st.write(f"**{p['name']}** | {p['phone']} | {p.get('email', 'N/A')}")
            with col2:
                if st.button("🗑️ Delete", key=f"del_p_{p['id']}"):
                    headers = {"Authorization": f"Bearer {st.session_state.token}"}
                    requests.delete(f"{API_URL}/patients/{p['id']}", headers=headers)
                    st.rerun()
    else:
        st.info("No patients yet!")

    st.subheader("Add New Patient")
    name = st.text_input("Name")
    phone = st.text_input("Phone")
    email = st.text_input("Email (optional)")
    if st.button("Add Patient"):
        response = add_patient(st.session_state.token, name, phone, email)
        if response.status_code == 200:
            st.success("Patient added!")
            st.rerun()
        else:
            st.error(response.json().get("detail", "Error!"))

       with tab2:
    st.subheader("All Appointments")
    appointments = get_appointments(st.session_state.token)
    if appointments:
        for a in appointments:
            col1, col2 = st.columns([5, 1])
            with col1:
                st.write(f"**Patient ID: {a['patient_id']}** | Dr. {a['doctor_name']} | {a['appointment_date'][:10]} | {a.get('reason', 'N/A')}")
            with col2:
                if st.button("🗑️ Delete", key=f"del_a_{a['id']}"):
                    headers = {"Authorization": f"Bearer {st.session_state.token}"}
                    requests.delete(f"{API_URL}/appointments/{a['id']}", headers=headers)
                    st.rerun()
    else:
        st.info("No appointments yet!")

    st.subheader("Add New Appointment")
    patient_id = st.number_input("Patient ID", min_value=1, step=1)
    doctor_name = st.text_input("Doctor Name")
    appointment_date = st.date_input("Date")
    reason = st.text_input("Reason (optional)")
    if st.button("Add Appointment"):
        from datetime import datetime
        dt = datetime.combine(appointment_date, datetime.min.time())
        response = add_appointment(st.session_state.token, int(patient_id), doctor_name, dt, reason)
        if response.status_code == 200:
            st.success("Appointment added!")
            st.rerun()
        else:
            st.error(response.json().get("detail", "Error!"))