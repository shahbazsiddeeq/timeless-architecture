"use client";

interface TranscriptionDisplayProps {
  transcriptions: string[];
}

export default function DiscussionDisplay({ transcriptions }: TranscriptionDisplayProps) {


  return (
    <div className="discussionBox" 
      style={{ 
         backgroundColor: "#000",
         color: "#fff",
         padding: "15px",
         borderRadius: "8px",
         width: "100%",
         height: "32vh",
         overflowY: "auto",
         boxSizing: "border-box",
         boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
         marginTop: "0px",
        //  msOverflowY:"auto",
        }}
    >
        {/* <h3 
            style={{ 
            marginBottom: "10px", 
            fontWeight: "bold",
            position: "sticky",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            paddingTop: "1rem",
            }}
        >Discussion</h3> */}
        
        <ul style={{ listStyle: "- ", padding: "20px", fontFamily: "Courier New"}}>
            {transcriptions.map((t, idx) => (
            <li key={idx}>{t}</li>
            ))}
        </ul>
        
        
      
        
    </div>
  );
}
