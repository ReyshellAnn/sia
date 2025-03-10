<!-- <script>
    import { db } from "$lib/firebase";
    import { collection, doc, writeBatch } from "firebase/firestore";
  
    async function addMedicines() {
      const medicinesRef = collection(db, "medicines");
      const batch = writeBatch(db);
  
      const medicines = Array.from({ length: 10 }, (_, i) => ({
        brand: "test",
        category: "Baby & Infant Care",
        description: "test",
        dosage: "1213 mL",
        expirationDate: "2025-02-19",
        form: "Capsule",
        generic: "test",
        imageUrl: "https://res.cloudinary.com/daol71ald/image/upload/v1740726219/AdvilCold_FluTablets20Pack_600x_rircmy.webp",
        name: `Medicine ${i + 1}`,
        prescriptionRequired: true,
        price: 1231.67,
        productCode: `5002102${i}`,
        sold: 0,
        stock: 21320,
        visibleToCustomers: true,
      }));
  
      medicines.forEach((medicine) => {
        const newDocRef = doc(medicinesRef);
        batch.set(newDocRef, medicine);
      });
  
      try {
        await batch.commit();
        alert("Medicines added successfully!");
      } catch (error) {
        console.error("Error adding medicines: ", error);
      }
    }
  </script>
  
  <button on:click={addMedicines}>Add 10 Medicines</button>
   -->