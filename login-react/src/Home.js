import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { BarChart as BarIcon, Phone, LogOut, Search, Fish, AlertTriangle, Clock, Shrimp } from 'lucide-react';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const [modal, setModal] = useState({ isOpen: false, title: '', content: '' });
    const [waterData, setWaterData] = useState([]);
    const [error, setError] = useState('');
    const [currentGraph, setCurrentGraph] = useState(0); // ควบคุมกราฟที่กำลังแสดง (0-6)

    // รายการพารามิเตอร์ทั้ง 7 ตัว
    const graphTypes = [
        {
            key: 'salinity',
            name: 'ความเค็ม (ppt)',
            color: '#8884d8',
            yDomain: [0, 30],
            referenceLines: [
                { y: 25, label: 'เกณฑ์สูงสุด (25)' },
                { y: 5, label: 'เกณฑ์ต่ำสุด (5)' },
            ],
        },
        {
            key: 'ph',
            name: 'pH',
            color: '#82ca9d',
            yDomain: [0, 14],
            referenceLines: [
                { y: 8.5, label: 'เกณฑ์สูงสุด (8.5)' },
                { y: 7.5, label: 'เกณฑ์ต่ำสุด (7.5)' },
            ],
        },
        {
            key: 'dissolved_oxygen',
            name: 'ออกซิเจนละลายน้ำ (mg/L)',
            color: '#ffc658',
            yDomain: [0, 10],
            referenceLines: [{ y: 4, label: 'เกณฑ์ต่ำสุด (4)' }],
        },
        {
            key: 'nitrogen',
            name: 'ไนโตรเจน (mg/L)',
            color: '#ff7300',
            yDomain: [0, 0.2],
            referenceLines: [{ y: 0.1, label: 'เกณฑ์สูงสุด (0.1)' }],
        },
        {
            key: 'hydrogen_sulfide',
            name: 'ไฮโดรเจนซัลไฟด์ (mg/L)',
            color: '#ff4040',
            yDomain: [0, 0.01],
            referenceLines: [{ y: 0.003, label: 'เกณฑ์สูงสุด (0.003)' }],
        },
        {
            key: 'bod',
            name: 'BOD (mg/L)',
            color: '#00C49F',
            yDomain: [0, 10],
            referenceLines: [],
        },
        {
            key: 'temperature',
            name: 'อุณหภูมิ (°C)',
            color: '#FFBB28',
            yDomain: [0, 40],
            referenceLines: [
                { y: 32, label: 'เกณฑ์สูงสุด (32)' },
                { y: 26, label: 'เกณฑ์ต่ำสุด (26)' },
            ],
        },
    ];

    useEffect(() => {
        document.body.style.minHeight = '100vh';
        document.body.style.margin = '0';

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchWaterQuality = async () => {
            try {
                const response = await axios.get('http://localhost:8080/member/water-quality', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('API Response:', response.data);
                if (response.data && response.data.length > 0) {
                    setWaterData(response.data);
                } else {
                    setError('ไม่มีข้อมูลคุณภาพน้ำในฐานข้อมูล');
                }
            } catch (err) {
                setError('ไม่สามารถดึงข้อมูลคุณภาพน้ำได้: ' + (err.response?.data?.error || err.message));
                console.error('Error fetching water quality:', err);
            }
        };

        fetchWaterQuality();

        return () => {
            document.body.style.minHeight = '';
            document.body.style.margin = '';
        };
    }, [navigate]);

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

    const openModal = (title, content) => {
        setModal({ isOpen: true, title, content });
    };

    const closeModal = () => {
        setModal({ isOpen: false, title: '', content: '' });
    };

    // ฟังก์ชันฟอร์แมตเวลาให้อยู่ในรูปแบบ "DD/MM/YYYY" (เฉพาะวันที่)
    const formatDateTime = (dateString) => {
        if (!dateString) return 'ไม่ระบุวันที่';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = (date.getFullYear() + 543).toString(); // แปลงเป็นพ.ศ.
        return `${day}/${month}/${year}`;
    };

    // เตรียมข้อมูลสำหรับกราฟ (ใช้ recorded_at เป็นเวลา และจำกัดข้อมูล 4 แถวล่าสุด)
    const chartData = waterData.slice(-4).map((data) => ({
        date: formatDateTime(data.recorded_at), // ใช้ recorded_at จากตารางใน pgAdmin 4
        salinity: Number(data.salinity) || 0,
        ph: Number(data.ph) || 0,
        dissolved_oxygen: Number(data.dissolved_oxygen) || 0,
        nitrogen: Number(data.nitrogen) || 0,
        hydrogen_sulfide: Number(data.hydrogen_sulfide) || 0,
        bod: Number(data.bod) || 0,
        temperature: Number(data.temperature) || 0,
    }));

    // ฟังก์ชันเพื่อสร้างการแจ้งเตือน (ใช้ข้อมูลล่าสุด)
    const latestData = waterData.length > 0 ? waterData[0] : null;
    const checkAlerts = () => {
        if (!latestData) {
            return 'ไม่มีข้อมูลคุณภาพน้ำให้ตรวจสอบ';
        }

        const alerts = [];

        if (latestData.salinity < 5 || latestData.salinity > 25) {
            alerts.push(`ความเค็ม (${latestData.salinity} ppt) อยู่นอกเกณฑ์ (ควรอยู่ระหว่าง 5-25 ppt)`);
        }

        if (latestData.ph < 7.5 || latestData.ph > 8.5) {
            alerts.push(`pH (${latestData.ph}) อยู่นอกเกณฑ์ (ควรอยู่ระหว่าง 7.5-8.5)`);
        }

        if (latestData.dissolved_oxygen < 4) {
            alerts.push(`ออกซิเจนละลายน้ำ (${latestData.dissolved_oxygen} mg/L) ต่ำเกินไป (ควร ≥ 4 mg/L)`);
        }

        if (latestData.nitrogen > 0.1) {
            alerts.push(`ไนโตรเจน (${latestData.nitrogen} mg/L) สูงเกินไป (ควร ≤ 0.1 mg/L)`);
        }

        if (latestData.hydrogen_sulfide > 0.003) {
            alerts.push(`ไฮโดรเจนซัลไฟด์ (${latestData.hydrogen_sulfide} mg/L) สูงเกินไป (ควร ≤ 0.003 mg/L)`);
        }

        if (latestData.temperature < 26 || latestData.temperature > 32) {
            alerts.push(`อุณหภูมิ (${latestData.temperature}°C) อยู่นอกเกณฑ์ (ควรอยู่ระหว่าง 26-32°C)`);
        }

        if (alerts.length === 0) {
            return 'คุณภาพน้ำอยู่ในเกณฑ์ปกติ';
        }

        return alerts.join('\n');
    };

    const handleAlertClick = () => {
        const alertContent = checkAlerts();
        openModal('⚠️ การแจ้งเตือนคุณภาพน้ำ', alertContent);
    };

    // ฟังก์ชันสำหรับการสลับกราฟ
    const handleNextGraph = () => {
        if (currentGraph < graphTypes.length - 1) {
            setCurrentGraph(currentGraph + 1);
        }
    };

    const handlePrevGraph = () => {
        if (currentGraph > 0) {
            setCurrentGraph(currentGraph - 1);
        }
    };

    // ข้อมูลกราฟปัจจุบัน
    const currentGraphData = graphTypes[currentGraph];

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.5 }}
            className="home-page"
        >
            <header className="header">
                <nav className="nav">
                    <a href="/water-quality">
                        <BarIcon size={18} /> ข้อมูลคุณภาพน้ำ
                    </a>
                    <button className="alert-btn" onClick={handleAlertClick}>
                        <AlertTriangle size={18} /> การแจ้งเตือน
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={18} /> ออกจากระบบ
                    </button>
                </nav>
            </header>

            <div className="main-content">
                <div className="content-left"></div>
                <div className="content-right">
                    <h1><Fish size={32} /> ยินดีต้อนรับสู่ฟาร์มกุ้งก้ามกราม</h1>
                    <h2>เพื่อคุณภาพน้ำที่ดี</h2>
                    <p>
                        จัดการฟาร์มของคุณด้วยข้อมูลคุณภาพน้ำแบบเรียลไทม์ <br />
                        ติดตามระดับ pH, ออกซิเจนละลายน้ำ, แอมโมเนีย และไนไตรต์ <br />
                        เพื่อให้มั่นใจว่าสภาพแวดล้อมของกุ้งเหมาะสมที่สุดสำหรับการเจริญเติบโต
                    </p>

                    {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                    {/* กราฟเดียวที่สลับได้ */}
                    <h3>{currentGraphData.name}</h3>
                    <div style={{ width: '100%', maxWidth: 600, height: 300, marginBottom: 20 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={currentGraphData.yDomain} />
                                <Tooltip />
                                <Bar dataKey={currentGraphData.key} fill={currentGraphData.color} />
                                {currentGraphData.referenceLines.map((line, index) => (
                                    <ReferenceLine
                                        key={index}
                                        y={line.y}
                                        stroke="red"
                                        strokeDasharray="3 3"
                                        label={line.label}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* ปุ่มสำหรับสลับกราฟ */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                        <button
                            onClick={handlePrevGraph}
                            disabled={currentGraph === 0}
                            style={{
                                padding: '10px 20px',
                                marginRight: '10px',
                                backgroundColor: currentGraph === 0 ? '#ccc' : '#8884d8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: currentGraph === 0 ? 'not-allowed' : 'pointer',
                            }}
                        >
                            ก่อนหน้า
                        </button>
                        <button
                            onClick={handleNextGraph}
                            disabled={currentGraph === graphTypes.length - 1}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: currentGraph === graphTypes.length - 1 ? '#ccc' : '#8884d8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: currentGraph === graphTypes.length - 1 ? 'not-allowed' : 'pointer',
                            }}
                        >
                            ถัดไป
                        </button>
                    </div>

                    <div className="button-group">
                        <button
                            className="action-btn"
                            onClick={() => navigate('/water-quality')}
                            style={{ marginTop: '10px' }}
                        >
                            <Search size={18} /> ดูข้อมูลคุณภาพน้ำ
                        </button>
                    </div>
                </div>
            </div>

            {modal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>{modal.title}</h2>
                        <div
                            className="modal-content"
                            dangerouslySetInnerHTML={{ __html: modal.content }}
                        />
                        <button className="close-btn" onClick={closeModal}>
                            ปิด
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Home;