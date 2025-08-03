import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './water-quality.css';
import { FaWater, FaFlask, FaWind, FaAtom, FaCloud, FaFish, FaThermometerHalf } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const WaterQuality = () => {
    const [waterData, setWaterData] = useState([]);
    const [error, setError] = useState('');
    const [modalData, setModalData] = useState({ isOpen: false, column: '', label: '', data: [] });
    const [hasChanged, setHasChanged] = useState(false); // State เพื่อควบคุมการกระพริบ
    const lastWaterDataRef = useRef(null); // Ref เพื่อเก็บข้อมูลก่อนหน้า
    const navigate = useNavigate();

    // ฟังก์ชันเลือกข้อมูลล่าสุดตาม recorded_at
    const getLatestRow = (data) => {
        if (data.length === 0) return null;
        return data.reduce((latest, current) => {
            return new Date(current.recorded_at) > new Date(latest.recorded_at) ? current : latest;
        }, data[0]);
    };

    useEffect(() => {
        document.body.style.background = 'linear-gradient(135deg, #a1c4fd, #c2e9fb)';
        document.body.style.minHeight = '100vh';
        document.body.style.margin = '0';
        document.body.style.fontFamily = 'Arial, sans-serif';

        const fetchWaterQuality = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('กรุณาเข้าสู่ระบบก่อน');
                setTimeout(() => navigate('/login'), 1000);
                return;
            }

            try {
                const response = await axios.get('http://localhost:8080/member/water-quality', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const newData = response.data;
                setWaterData(newData);
            } catch (error) {
                if (error.response?.status === 403) {
                    setError('โทเค็นไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่');
                    localStorage.removeItem('token');
                    setTimeout(() => navigate('/login'), 1000);
                } else {
                    setError(error.response?.data?.msg || 'ไม่สามารถดึงข้อมูลได้');
                }
                console.error(error);
            }
        };

        fetchWaterQuality();
        const interval = setInterval(fetchWaterQuality, 2000); // อัปเดตทุก 2 วินาที

        return () => {
            document.body.style.background = '';
            document.body.style.minHeight = '';
            document.body.style.margin = '';
            document.body.style.fontFamily = '';
            clearInterval(interval);
        };
    }, [navigate]);

    // ตรวจสอบการเปลี่ยนแปลงข้อมูล
    useEffect(() => {
        const latestNew = getLatestRow(waterData);
        const latestOld = lastWaterDataRef.current ? getLatestRow(lastWaterDataRef.current) : null;
        if (latestNew && latestOld) {
            const changed = (
                latestNew.salinity !== latestOld.salinity ||
                latestNew.ph !== latestOld.ph ||
                (latestNew.dissolved_oxygen || latestNew.oxygen) !== (latestOld.dissolved_oxygen || latestOld.oxygen) ||
                latestNew.nitrogen !== latestOld.nitrogen ||
                latestNew.hydrogen_sulfide !== latestOld.hydrogen_sulfide ||
                latestNew.bod !== latestOld.bod ||
                latestNew.temperature !== latestOld.temperature
            );
            if (changed) {
                setHasChanged(true);
                const timer = setTimeout(() => setHasChanged(false), 1000);
                return () => clearTimeout(timer);
            }
        }
        lastWaterDataRef.current = waterData;
    }, [waterData]);

    const handleLogout = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.post('http://localhost:8080/member/logout', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.status === 200) {
                localStorage.removeItem('token');
                navigate('/login');
            } else {
                alert('การออกจากระบบล้มเหลว');
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการออกจากระบบ');
            console.error(error);
        }
    };

    const openModal = (column, label) => {
        const data = waterData.map((row, index) => ({
            index: index + 1,
            value: column === 'recorded_at'
                ? new Date(row[column]).toLocaleString('th-TH')
                : column === 'oxygen'
                ? row.dissolved_oxygen || row.oxygen
                : row[column],
            recorded_at: new Date(row.recorded_at).toLocaleString('th-TH'),
        }));
        setModalData({ isOpen: true, column, label, data });
    };

    const chartData = waterData.map(item => ({
        recorded_at: new Date(item.recorded_at).toLocaleString('th-TH'),
        salinity: item.salinity,
        ph: item.ph,
        oxygen: item.dissolved_oxygen || item.oxygen,
        nitrogen: item.nitrogen,
        hydrogen_sulfide: item.hydrogen_sulfide,
        bod: item.bod,
        temperature: item.temperature
    }));

    const closeModal = () => {
        setModalData({ isOpen: false, column: '', label: '', data: [] });
    };

    const buttons = [
        { key: 'salinity', label: 'ความเค็ม (ppt)', icon: <FaWater /> },
        { key: 'ph', label: 'pH', icon: <FaFlask /> },
        { key: 'oxygen', label: 'ออกซิเจน (mg/L)', icon: <FaWind /> },
        { key: 'nitrogen', label: 'ไนโตรเจน (mg/L)', icon: <FaAtom /> },
        { key: 'hydrogen_sulfide', label: 'ไฮโดรเจนซัลไฟด์ (mg/L)', icon: <FaCloud /> },
        { key: 'bod', label: 'BOD (mg/L)', icon: <FaFish /> },
        { key: 'temperature', label: 'อุณหภูมิ (°C)', icon: <FaThermometerHalf /> },
    ];

    const checkWaterQuality = (data) => {
        if (!data) return { isSuitable: false, issues: ['ไม่มีข้อมูล'] };

        const issues = [];
        if (data.salinity < 5 || data.salinity > 25) {
            issues.push(`ความเค็ม (${data.salinity} ppt) อยู่นอกเกณฑ์ 5 - 25 ppt`);
        }
        if (data.ph < 7.5 || data.ph > 8.5) {
            issues.push(`pH (${data.ph}) อยู่นอกเกณฑ์ 7.5 - 8.5`);
        }
        const oxygen = data.dissolved_oxygen || data.oxygen;
        if (oxygen < 4) {
            issues.push(`ออกซิเจน (${oxygen} mg/L) ต่ำกว่าเกณฑ์ 4 mg/L`);
        }
        if (data.nitrogen > 0.1) {
            issues.push(`ไนโตรเจน (${data.nitrogen} mg/L) สูงกว่าเกณฑ์แอมโมเนีย 0.1 mg/L`);
        }
        if (data.hydrogen_sulfide > 0.003) {
            issues.push(`ไฮโดรเจนซัลไฟด์ (${data.hydrogen_sulfide} mg/L) สูงกว่าเกณฑ์ 0.003 mg/L`);
        }
        if (data.bod > 20) {
            issues.push(`BOD (${data.bod} mg/L) สูงกว่าเกณฑ์ 20 mg/L`);
        }
        if (data.temperature < 26 || data.temperature > 32) {
            issues.push(`อุณหภูมิ (${data.temperature} °C) อยู่นอกเกณฑ์ 26 - 32°C`);
        }

        return {
            isSuitable: issues.length === 0,
            issues: issues.length > 0 ? issues : ['เหมาะสมสำหรับการเลี้ยงกุ้ง']
        };
    };

    const latestData = getLatestRow(waterData);
    const qualityCheck = checkWaterQuality(latestData);

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.5 }}
            className="container"
        >
            <h1>ข้อมูลคุณภาพน้ำ - ฟาร์มกุ้งก้ามกราม</h1>
            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

            <div className="dashboard">
                <h2>ภาพรวมคุณภาพน้ำ (ล่าสุด)</h2>
                {latestData ? (
                    <>
                        <div className="dashboard-content">
                            <div className="dashboard-item">
                                <span className="dashboard-label">ความเค็ม (ppt):</span>
                                <span className={`dashboard-value ${hasChanged ? 'blink' : ''}`} id="salinity-value">{latestData.salinity || 'N/A'}</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-label">pH:</span>
                                <span className={`dashboard-value ${hasChanged ? 'blink' : ''}`} id="ph-value">{latestData.ph || 'N/A'}</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-label">ออกซิเจน (mg/L):</span>
                                <span className={`dashboard-value ${hasChanged ? 'blink' : ''}`} id="oxygen-value">{latestData.dissolved_oxygen || latestData.oxygen || 'N/A'}</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-label">ไนโตรเจน (mg/L):</span>
                                <span className={`dashboard-value ${hasChanged ? 'blink' : ''}`} id="nitrogen-value">{latestData.nitrogen || 'N/A'}</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-label">ไฮโดรเจนซัลไฟด์ (mg/L):</span>
                                <span className={`dashboard-value ${hasChanged ? 'blink' : ''}`} id="hydrogen_sulfide-value">{latestData.hydrogen_sulfide || 'N/A'}</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-label">BOD (mg/L):</span>
                                <span className={`dashboard-value ${hasChanged ? 'blink' : ''}`} id="bod-value">{latestData.bod || 'N/A'}</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-label">อุณหภูมิ (°C):</span>
                                <span className={`dashboard-value ${hasChanged ? 'blink' : ''}`} id="temperature-value">{latestData.temperature || 'N/A'}</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-label">วันที่และเวลา:</span>
                                <span className="dashboard-value">
                                    {new Date(latestData.recorded_at).toLocaleString('th-TH')}
                                </span>
                            </div>
                        </div>

                        <div className="quality-summary">
                            <h3>คุณภาพโดยรวม: {qualityCheck.isSuitable ? 'เหมาะสม' : 'ไม่เหมาะสม'}</h3>
                            <ul>
                                {qualityCheck.issues.map((issue, index) => (
                                    <li key={index} className={qualityCheck.isSuitable ? 'suitable' : 'unsuitable'}>
                                        {issue}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                ) : (
                    <p style={{ textAlign: 'center', color: '#666' }}>ไม่มีข้อมูล</p>
                )}
            </div>

            <div className="button-container">
                {buttons.map((btn) => (
                    <button
                        key={btn.key}
                        className="column-btn"
                        onClick={() => openModal(btn.key, btn.label)}
                    >
                        <div className="icon">{btn.icon}</div>
                        <span>{btn.label}</span>
                    </button>
                ))}
            </div>

            {modalData.isOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>กราฟ: {modalData.label}</h2>
                        <div style={{ width: '100%', height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={modalData.data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="recorded_at" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="#8884d8" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="modal-table">
                                <thead>
                                    <tr>
                                        <th>หมายเลข</th>
                                        <th>วันที่และเวลา</th>
                                        <th>{modalData.label}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.data.map((row, index) => (
                                        <tr key={index}>
                                            <td>{row.index}</td>
                                            <td>{row.recorded_at}</td>
                                            <td>{row.value || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button className="close-btn" onClick={closeModal}>
                            ปิด
                        </button>
                    </div>
                </div>
            )}

            <div className="footer">
                <button className="home-btn" onClick={() => navigate('/')} aria-label="กลับไปหน้าแรก">
                    หน้าแรก
                </button>
                <button className="status-btn" onClick={() => navigate('/status')}>
                    ค่าสถานะ
                </button>
                <button id="logoutBtn" onClick={handleLogout}>ออกจากระบบ</button>
            </div>
        </motion.div>
    );
};

export default WaterQuality;