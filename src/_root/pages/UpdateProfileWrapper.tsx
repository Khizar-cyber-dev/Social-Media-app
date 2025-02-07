//import { useParams } from "react-router-dom";
import UpdateProfile from "./UpdateProfile";

const UpdateProfileWrapper = () => {
  //const { id } = useParams<{ id: string }>();

  const someFieldChangeFunction = () => {
    // Implement the field change function
  };

  const someMediaUrl = ""; // Replace with the actual media URL

  return (
    <UpdateProfile fieldChange={someFieldChangeFunction} mediaUrl={someMediaUrl} />
  );
};

export default UpdateProfileWrapper;